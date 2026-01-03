import { parse } from "svelte/compiler";
import YAML from "yaml";
import type { LushTokenKind, SusyNode, TokenTypeName } from "lush-types";

declare global {
  interface ImportMeta {
    main?: boolean;
  }
}

type AstNode = {
  type: string;
  start?: number;
  end?: number;
  [key: string]: unknown;
};

type BuiltNode = {
  susy: SusyNode;
  start: number;
  end: number;
};

const SVELTE_KIND = "Svelte" as unknown as LushTokenKind;

// Check for a non-null object.
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// Narrow unknown to a Svelte AST node with spans.
const isAstNode = (value: unknown): value is AstNode => {
  if (!isObject(value)) return false;
  const type = value.type;
  const start = value.start;
  const end = value.end;
  return (
    typeof type === "string" &&
    typeof start === "number" &&
    typeof end === "number"
  );
};

// Normalize an AST node span to a concrete start/end.
const getSpan = (node: AstNode): { start: number; end: number } => {
  const start = typeof node.start === "number" ? node.start : 0;
  const end = typeof node.end === "number" ? node.end : start;
  return { start, end };
};

// Collect child AST nodes with their parent key names.
const collectChildren = (node: AstNode): { child: AstNode; nameAsSon: string }[] => {
  const children: { child: AstNode; nameAsSon: string }[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isAstNode(entry)) children.push({ child: entry, nameAsSon: key });
      }
      continue;
    }
    if (isAstNode(value)) {
      children.push({ child: value, nameAsSon: key });
    }
  }
  return children;
};

// Create a Susy "Space" node spanning a source gap.
const makeSpaceNode = (
  source: string,
  start: number,
  end: number
): BuiltNode => {
  const text = source.slice(start, end);
  return {
    susy: {
      kind: SVELTE_KIND,
      type: "Space" as unknown as TokenTypeName,
      tokenIdx: 0,
      text,
      x: start,
    },
    start,
    end,
  };
};

// Convert a Svelte AST node to a Susy node subtree.
const buildSusy = (
  node: AstNode,
  source: string,
  nameAsSon?: string
): BuiltNode => {
  const { start, end } = getSpan(node);

  const children = collectChildren(node).map((entry) =>
    buildSusy(entry.child, source, entry.nameAsSon)
  );

  children.sort((a, b) => a.start - b.start || a.end - b.end);

  const kids: SusyNode[] = [];
  let prevEnd: number | undefined;
  for (let idx = 0; idx < children.length; idx += 1) {
    const current = children[idx];
    if (typeof prevEnd === "number" && current.start > prevEnd) {
      const space = makeSpaceNode(source, prevEnd, current.start);
      kids.push(space.susy);
    }
    kids.push(current.susy);
    prevEnd = current.end;
  }

  const susy: SusyNode = {
    kind: SVELTE_KIND,
    type: (node.type ?? "Root") as unknown as TokenTypeName,
    tokenIdx: 0,
  };

  if (typeof nameAsSon === "string") susy.nameAsSon = nameAsSon;
  if (node.type === "Element" && typeof node.name === "string") {
    susy.text = node.name;
  }
  if (kids.length > 0) susy.kids = kids;
  if (!susy.kids && typeof susy.text !== "string") {
    susy.text = source.slice(start, end);
  }
  if (typeof start === "number") susy.x = start;

  return { susy, start, end };
};

// Assign sequential token indices across a Susy tree.
const assignTokenIdx = (node: SusyNode, tokenIdxRef: { value: number }) => {
  node.tokenIdx = tokenIdxRef.value++;
  if (Array.isArray(node.kids)) {
    for (const kid of node.kids) assignTokenIdx(kid, tokenIdxRef);
  }
};

// Project Svelte source into a SusyNode tree.
export const susySvelteProjection = (
  source: string,
  filename = "lk.svelte"
): SusyNode => {
  const ast = parse(source, { filename }) as AstNode;
  const root = buildSusy(ast, source).susy;
  assignTokenIdx(root, { value: 0 });
  return root;
};

// called if that file is executed stand alone
if (import.meta.main) {
  // Run CLI mode when invoked directly.
  void (async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const filePath = process.argv[2] ?? "lk.svelte";
    const source = readFileSync(filePath, "utf8");
    const root = susySvelteProjection(source, resolve(filePath));
    process.stdout.write(`${YAML.stringify(root)}`);
  })();
}
