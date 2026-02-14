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

// Flatten a nested component tree into a single ordered list.
function flattenComponents(components) {
  const rows = [];
  for (const component of components) {
    rows.push(component);
    rows.push(...flattenComponents(component.innerComponents));
  }
  return rows;
}

// Render fixed-width columns for a readable component extraction report.
function formatComponentReport(components) {
  const all = flattenComponents(components);
  const headers = {
    path: "PATH",
    name: "NAME",
    type: "TYPE",
    size: "W x H",
  };
  const rows = all.map((component) => ({
    path: component.path,
    name: component.name,
    type: component.componentType,
    size: `${component.w}x${component.h}`,
  }));

  const widths = {
    path: Math.max(headers.path.length, ...rows.map((row) => row.path.length), 4),
    name: Math.max(headers.name.length, ...rows.map((row) => row.name.length), 4),
    type: Math.max(headers.type.length, ...rows.map((row) => row.type.length), 4),
    size: Math.max(headers.size.length, ...rows.map((row) => row.size.length), 4),
  };

  const formatRow = (row) =>
    `${row.path.padEnd(widths.path)}  ${row.name.padEnd(widths.name)}  ${row.type.padEnd(widths.type)}  ${row.size.padEnd(widths.size)}`;

  const lines = [
    formatRow(headers),
    `${"-".repeat(widths.path)}  ${"-".repeat(widths.name)}  ${"-".repeat(widths.type)}  ${"-".repeat(widths.size)}`,
    ...rows.map(formatRow),
  ];
  return `${lines.join("\n")}\n`;
}

// Build the candidate component list from explicit component markers and form fields.
function buildComponentCollector() {
  return () => {
    // Create a readable default caption from a component name.
    const captionFromName = (name) =>
      name
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

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

    /** @type {Array<{element: Element, name: string, svelteComponent?: string, componentType: string, caption: string, x: number, y: number, w: number, h: number}>} */
    const candidates = [];
    const allElements = Array.from(document.querySelectorAll("*"));

    for (const element of allElements) {
      const rect = rectFromElement(element);
      if (!rect) {
        continue;
      }

      const declaredComponent = element.getAttribute("data-component")?.trim() ?? "";
      if (declaredComponent.length > 0) {
        candidates.push({
          element,
          name: declaredComponent,
          svelteComponent: declaredComponent,
          componentType: declaredComponent,
          caption: captionFromName(declaredComponent),
          ...rect,
        });
        continue;
      }

      const tag = element.tagName.toLowerCase();
      const isFormField =
        tag === "button" ||
        tag === "input" ||
        tag === "select" ||
        tag === "textarea";
      if (!isFormField) {
        continue;
      }

      const name =
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        element.getAttribute("id") ||
        element.getAttribute("type") ||
        element.tagName.toLowerCase();
      const safeName = name.length > 0 ? name : "FormComponent";
      const inputType =
        tag === "input"
          ? (element.getAttribute("type") ?? "text").toLowerCase()
          : tag;
      candidates.push({
        element,
        name: safeName,
        componentType: inputType,
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
        candidate.svelteComponent ?? "",
        candidate.x,
        candidate.y,
        candidate.w,
        candidate.h,
        candidate.componentType,
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
      ...(entry.svelteComponent
        ? { svelteComponent: entry.svelteComponent }
        : {}),
      componentType: entry.componentType,
      x: entry.x,
      y: entry.y,
      w: entry.w,
      h: entry.h,
      caption: entry.caption,
      path: "",
      innerComponents: [],
    }));

    for (const [childIndex, parentIndex] of parentOf.entries()) {
      nodes[parentIndex].innerComponents.push(nodes[childIndex]);
    }

    const rootNodes = nodes.filter((_, index) => !parentOf.has(index));
    const usedNames = new Map();
    const uniquifyNames = (items) => {
      for (const item of items) {
        const baseName = item.name;
        const seen = usedNames.get(baseName) ?? 0;
        const nextSeen = seen + 1;
        usedNames.set(baseName, nextSeen);
        item.name = nextSeen === 1 ? baseName : `${baseName}_${nextSeen}`;
        if (!item.caption || item.caption.trim().length === 0) {
          item.caption = captionFromName(item.name);
        }
        uniquifyNames(item.innerComponents);
      }
    };
    // Ensure each emitted component name is unique for stable paths.
    uniquifyNames(rootNodes);
    const setPaths = (items, parentPath = "") => {
      items.forEach((item) => {
        const path = parentPath.length > 0 ? `${parentPath}.${item.name}` : item.name;
        item.path = path;
        setPaths(item.innerComponents, path);
      });
    };
    setPaths(rootNodes);
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
  const reportPath = resolve(args.report ?? "manim/output/editor-components.txt");
  const waitMs = toPositiveInt(args.wait, 1200);

  await mkdir(dirname(screenshotPath), { recursive: true });
  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(dirname(reportPath), { recursive: true });

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
    await writeFile(reportPath, formatComponentReport(componentData), "utf8");

    console.log(`screenshot=${screenshotPath}`);
    console.log(`components=${outputPath}`);
    console.log(`report=${reportPath}`);
    console.log(`count=${componentData.length}`);
    console.log(
      "coords=top-left origin; x rightward; y downward; values in screenshot pixels",
    );
  } finally {
    await browser.close();
  }
}

await run();
