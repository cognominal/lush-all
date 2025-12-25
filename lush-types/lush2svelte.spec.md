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
export function lush2svelte(lush: Multiline) { ... }
```

## Behavior

- Leste is a "posh" variant of Lush.
- Poshification is the rendering of a `Multiline` using the highlight YAML
  file (`svelte-codemirror/src/highlight.yaml`).
- This function currently focuses on the poshification of HTML attributes.
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
  - `ast.html.children[0]` is the `Element`: node.
  - `ast.html.children[0].attributes` contains `Attribute` nodes.
  - `ast.html.children[0].children` contains text nodes for element content.

## InputToken tree vs MultiLine mapping (clarification)

A MultiLine represents a zone of edition of a susy (/for now Leste) that compiles
into an astre (for now svelte).

- `MultiLine` is defined in the same file as `InputToken`.
- The mapping from an `InputToken` tree to `MultiLine` is currently unclear.
- Likely direction: introduce an interface that carries both:
  - `multiline`: the existing `MultiLine` layout (textual layout/lines),
  - `root`: the root `InputToken` for the concrete syntax tree.
- Rationale: `MultiLine` represents layout as text, while the `InputToken` tree
  represents the concrete syntax tree structure. 

## YAML rules for InputToken rendering (from svelte2leste)

- The poshification pipeline uses YAML rule maps to transform a Svelte AST
  (an "astre") into an `InputToken` tree (a "susy" representation).
- A posh susy is a lean, user-editable representation that uses font style
  as syntax.
- Examples (attribute subset):
  - `id="an_id"` translates into `#an_id`
  - `class="class1 class2"` translates into `.class1 .class2`
- These textual forms are represented as an `InputToken` tree; the `ast` field
  of each `InputToken` points to the corresponding astre node.
- Test items follow the naming convention:
  - `name.svelte.yaml`
  - `name.leste.yaml`
  - A test asserts `.svelte.yaml` transforms into `.leste.yaml`.
- Rules are YAML maps; the transformer matches by `type` and uses the first
  matching rule.
- Example rule for `Attribute` with name `id`:
  - When `name: id`, `gen_` emits an `InputToken` with `kind: leste`, `type: id`,
    and `text: $value`.
- Example rule for `Attribute` with name `class` (more complex; uses a helper
  to split values and emit `attrclass` tokens).
- Reference: `data/svelte2leste/README.md`.

## UNSPECIFIED

- The exact `Multiline` type alias or shape in this context.
- The concrete expected AST structure beyond the attribute-level rules above.
