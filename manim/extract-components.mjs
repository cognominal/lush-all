#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import puppeteer from "puppeteer";

/**
 * Coordinate convention:
 * - x, y are the TOP-LEFT pixel of the component box in the screenshot.
 * - w, h are width/height in pixels.
 * - origin is at screenshot top-left, x grows right, y grows down.
 * - innerComponents use the same absolute screenshot coordinate system.
 */

// Parse command-line arguments into an options object.
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = value;
    i += 1;
  }
  return parsed;
}

// Convert strings to bounded positive integers with fallback defaults.
function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

// Build the candidate component list from Svelte metadata and form controls.
function buildComponentCollector() {
  return () => {
    // Create a readable default caption from a component name.
    const captionFromName = (name) =>
      name
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Find the most useful component label from Svelte metadata.
    const nameFromSvelteMeta = (meta) => {
      if (!meta || typeof meta !== "object") {
        return null;
      }
      const candidates = [
        meta.componentName,
        meta.tagName,
        meta.filename,
        meta.file,
      ].filter((item) => typeof item === "string" && item.length > 0);
      if (candidates.length === 0) {
        return null;
      }
      const raw = candidates[0];
      const fromPath = raw.split("/").pop() ?? raw;
      return fromPath.replace(/\.[a-zA-Z0-9]+$/, "");
    };

    // Convert an element to a stable rectangle in screenshot pixel space.
    const rectFromElement = (element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.round(rect.left);
      const y = Math.round(rect.top);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w <= 1 || h <= 1) {
        return null;
      }
      if (x + w <= 0 || y + h <= 0) {
        return null;
      }
      if (x >= window.innerWidth || y >= window.innerHeight) {
        return null;
      }
      return { x, y, w, h };
    };

    /** @type {Array<{element: Element, name: string, svelteComponentName?: string, caption: string, x: number, y: number, w: number, h: number}>} */
    const candidates = [];
    const allElements = Array.from(document.querySelectorAll("*"));

    for (const element of allElements) {
      const rect = rectFromElement(element);
      if (!rect) {
        continue;
      }

      const hasSvelteMeta = Object.prototype.hasOwnProperty.call(
        element,
        "__svelte_meta",
      );
      if (hasSvelteMeta) {
        const meta = element.__svelte_meta;
        const componentName =
          nameFromSvelteMeta(meta) ??
          element.getAttribute("data-component") ??
          element.tagName.toLowerCase();
        const caption = captionFromName(componentName);
        candidates.push({
          element,
          name: componentName,
          svelteComponentName: componentName,
          caption,
          ...rect,
        });
      }

      const tag = element.tagName.toLowerCase();
      const role = element.getAttribute("role") ?? "";
      const isFormComponent =
        tag === "form" ||
        tag === "button" ||
        tag === "input" ||
        tag === "select" ||
        tag === "textarea" ||
        role === "button" ||
        role === "textbox" ||
        role === "combobox";

      if (!isFormComponent) {
        continue;
      }

      const name =
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        element.getAttribute("id") ||
        element.getAttribute("type") ||
        element.tagName.toLowerCase();
      const safeName = name.length > 0 ? name : "FormComponent";
      candidates.push({
        element,
        name: safeName,
        caption: captionFromName(safeName),
        ...rect,
      });
    }

    // Remove duplicate entries generated from overlapping selectors.
    const deduped = [];
    const seen = new Set();
    for (const candidate of candidates) {
      const key = [
        candidate.name,
        candidate.svelteComponentName ?? "",
        candidate.x,
        candidate.y,
        candidate.w,
        candidate.h,
      ].join(":");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(candidate);
    }

    // Sort by area descending so parents are visited before children.
    deduped.sort((a, b) => b.w * b.h - a.w * a.h);

    // Determine direct parent relationships for nested innerComponents.
    const parentOf = new Map();
    for (let i = 0; i < deduped.length; i += 1) {
      const child = deduped[i];
      let bestParentIndex = -1;
      let bestArea = Number.POSITIVE_INFINITY;
      for (let j = 0; j < deduped.length; j += 1) {
        if (i === j) {
          continue;
        }
        const parent = deduped[j];
        const parentArea = parent.w * parent.h;
        const fitsRect =
          child.x >= parent.x &&
          child.y >= parent.y &&
          child.x + child.w <= parent.x + parent.w &&
          child.y + child.h <= parent.y + parent.h;
        if (!fitsRect) {
          continue;
        }
        if (!parent.element.contains(child.element)) {
          continue;
        }
        if (parentArea < bestArea) {
          bestArea = parentArea;
          bestParentIndex = j;
        }
      }
      if (bestParentIndex >= 0) {
        parentOf.set(i, bestParentIndex);
      }
    }

    // Convert candidates into the requested dict schema.
    const nodes = deduped.map((entry) => ({
      name: entry.name,
      ...(entry.svelteComponentName
        ? { svelteComponentName: entry.svelteComponentName }
        : {}),
      x: entry.x,
      y: entry.y,
      w: entry.w,
      h: entry.h,
      caption: entry.caption,
      innerComponents: [],
    }));

    for (const [childIndex, parentIndex] of parentOf.entries()) {
      nodes[parentIndex].innerComponents.push(nodes[childIndex]);
    }

    const rootNodes = nodes.filter((_, index) => !parentOf.has(index));
    return rootNodes;
  };
}

// Extract a screenshot and a nested component array from the target page.
async function run() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.url ?? "http://localhost:5173/editor";
  const width = toPositiveInt(args.width, 1920);
  const height = toPositiveInt(args.height, 1080);
  const dpr = toPositiveInt(args.dpr, 1);
  const screenshotPath = resolve(
    args.screenshot ?? "manim/output/editor-1920x1080.jpg",
  );
  const outputPath = resolve(args.output ?? "manim/output/editor-components.json");
  const waitMs = toPositiveInt(args.wait, 1200);

  await mkdir(dirname(screenshotPath), { recursive: true });
  await mkdir(dirname(outputPath), { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: dpr });
    await page.goto(url, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    await page.screenshot({
      path: screenshotPath,
      type: "jpeg",
      quality: 92,
      fullPage: false,
    });

    const collector = buildComponentCollector();
    const componentData = await page.evaluate(collector);
    await writeFile(outputPath, `${JSON.stringify(componentData, null, 2)}\n`, "utf8");

    console.log(`screenshot=${screenshotPath}`);
    console.log(`components=${outputPath}`);
    console.log(`count=${componentData.length}`);
    console.log(
      "coords=top-left origin; x rightward; y downward; values in screenshot pixels",
    );
  } finally {
    await browser.close();
  }
}

await run();
