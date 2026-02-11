# lush2svelte spec

## Purpose

Convert a Leste (lush) representation into a Svelte-compatible structure and
describe how poshification renders Leste using the highlight YAML.

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
export function lush2svelte(lush: SusyEd) { ... } // REVIEW
```

## Behavior

- Leste is a "posh" variant of Lush.
- Poshification is the rendering of a `SusyEd` using the highlight YAML (REVIEW)
  file (`svelte-codemirror/src/themes/default.yaml`).
- This function currently focuses on the poshification of HTML attributes.
- For a Svelte HTML attribute with name `id`, emit a `SusyNode` of kind
  `lush` and type `id`.
- For a Svelte HTML attribute with name `class`, split the attribute value on
  spaces; for each subpart, emit a `SusyNode` of kind `lush` and type
  `attrclass`, with space separators represented as `SusyNode` entries
  as well.

## AST placement

- The AST generated for an attribute must be embedded into a complete Svelte
  AST tree (i.e., not a standalone attribute node).
- Rationale: attribute nodes should be valid only in the context of their
  surrounding element and document tree.
- Expected enclosing structure (from compile output of `<h1 id="an_id">text</h1>`):
  - `ast.html` is a `Fragment` with `children` array.
  - `ast.html.children[0]` is the `Element`: node.
  - `ast.html.children[0].attributes` contains `Attribute` nodes.
  - `ast.html.children[0].children` contains text nodes for element content.

## SusyNode tree vs SusyLines mapping (clarification)

A SusyLines value represents a zone of edition of a susy (/for now Leste) that compiles
into an astre (for now svelte).

- Likely direction: introduce an interface that carries both:
  - `lines`: the existing `SusyLines` layout (textual layout/lines), (REVIEW)
  - `root`: the root `SusyNode` for the concrete syntax tree.
- Rationale: `SusyLines` represents layout as text, while the `SusyNode` tree
  represents the concrete syntax tree structure.

## YAML rules for SusyNode rendering (from svelte2leste)

- The poshification pipeline uses YAML rule maps to transform a Svelte AST
  (an "astre") into a `SusyNode` tree (a "susy" representation).
- A posh susy is a lean, user-editable representation that uses font style
  as syntax.
- Examples (attribute subset):
  - `id="an_id"` translates into `#an_id`
  - `class="class1 class2"` translates into `.class1 .class2`
- These textual forms are represented as a `SusyNode` tree; the `ast` field
  of each `SusyNode` points to the corresponding astre node.
- Test items follow the naming convention:
  - `name.svelte.yaml`
  - `name.leste.yaml`
  - A test asserts `.svelte.yaml` transforms into `.leste.yaml`.
- Rules are YAML maps; the transformer matches by `type` and uses the first
  matching rule.
- Example rule for `Attribute` with name `id`:
  - When `name: id`, `gen_` emits a `SusyNode` with `kind: leste`, `type: id`,
    and `text: $value`.
- Example rule for `Attribute` with name `class` (more complex; uses a helper
  to split values and emit `attrclass` tokens).
- Reference: `data/svelte2leste/README.md`.

## UNSPECIFIED

- The exact `SusyEd`/`SusyLines` type alias or shape in this context. (REVIEW)
- The concrete expected AST structure beyond the attribute-level rules above.
