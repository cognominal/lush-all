# lush2svelte spec

## Purpose

Convert a Leste (lush) representation into a Svelte-compatible structure.

## Notes on types

- The compile result type is `CompileResult` from `svelte/types/index.d.ts`.
- This spec assumes a successful compile result.
- The picker type should be named `Picker` in `sveltePick` code and spec.

### CompileResult (successful)

```
export interface CompileResult {
  js: { code: string; map: SourceMap };
  css: null | { code: string; map: SourceMap; hasGlobal: boolean };
  warnings: Warning[];
  metadata: { runes: boolean };
  ast: any;
}
```

## Function name and signature

```
export function lush2svelte(lush: Multiline) { ... }
```

## Behavior

- Leste is a "posh" variant of Lush. (UNSPECIFIED: clarify what "posh" means.)
- This function currently focuses on "poshification" of HTML attributes.
- For a Svelte HTML attribute with name `id`, emit an `InputToken` of kind
  `lush` and type `id`.
- For a Svelte HTML attribute with name `class`, split the attribute value on
  spaces; for each subpart, emit an `InputToken` of kind `lush` and type
  `attrclass`, with space separators represented as `InputToken` entries
  as well.

## AST placement

- The AST generated for an attribute must be embedded into a complete Svelte
  AST tree (i.e., not a standalone attribute node).
- Rationale: attribute nodes should be valid only in the context of their
  surrounding element and document tree.
- Expected enclosing structure (from compile output of `<h1 id="an_id">text</h1>`):
  - `ast.html` is a `Fragment` with `children` array.
  - `ast.html.children[0]` is the `Element` node.
  - `ast.html.children[0].attributes` contains `Attribute` nodes.
  - `ast.html.children[0].children` contains text nodes for element content.

## UNSPECIFIED

- The precise meaning of "posh" in Leste vs Lush.
- The exact `Multiline` type alias or shape in this context.
- The concrete expected AST structure beyond the attribute-level rules above.

## InputToken tree vs MultiLine mapping (clarification)

- `MultiLine` is defined in the same file as `InputToken`.
- The mapping from an `InputToken` tree to `MultiLine` is currently unclear.
- Likely direction: introduce an interface that carries both:
  - `multiline`: the existing `MultiLine` layout (textual layout/lines),
  - `root`: the root `InputToken` for the concrete syntax tree.
- Rationale: `MultiLine` represents layout as text, while the `InputToken` tree
  represents the concrete syntax tree structure.
