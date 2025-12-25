
# Lush concepts

This doc is the entry point to document lush.
For the installation, see [README.md](./README.md)

## Lush terminology

We have now a [glossary](./glossary.md).

We use **vanilla susy** for the standard syntactic conventions of a language
and **custom susy** for adapted conventions. We call **posh susy** (or **posh**
as a noun) the version where font styling is part of the syntax itself. In
posh, style is a primary notation, not a secondary layer like syntax or
semantic highlighting.

A `susyed` is an editor or an editor mode suitable to edit susys.

## Benefit and cost of poshing

Poshing removes the need for reserved keywords: keywords are recognized by
poshing. String interpolation does not require special quoting or syntax
markers either; poshing carries that information.

The cost of custom susys and poshing is an adapted ecosystem. We call an editor
that can work with these conventions a **susyed**.

## UI for lushed

We currently implement lushed using codemirror. But we want a logic independant
of the UI used. We hope to eventually support a TUI (we did in rdline/lush), in nvim (but that would involve using lus) and monaco/vscode. 

## Data structure for lushed

Lushed, our susyed, is a mostly structural editor that updates an underlying
AST. An instance of the `SusyEd` interface stores the data for a lushed.

Note: SusyEd was previously `MultiLine` or `TokenMultiLine`. `InputToken` has
been split into two types: `SusyTok` and `SusyNode`.

`SusyEd` maintains two complementary views of the same data: `root` as a tree
and `lines` as an array of lines.

```ts
interface SusyEd {
  root: SusyNode
  lines: SusyLine[][]
}
```

A Susy tree is composed of `SusyNode`s that are either `SusyINode`
(intermediate nodes) or `SusyLeaf`s. `SusyINode`s do not have a text field.
To recover the unposhed text in a tree, walk its `SusyLeaf`s. A `SusyLeaf`
cannot be multi-line. To represent a multi-line leaf, split it into
line-sized `SusyLeaf`s and store them as children of a parent node.

```ts
interface SusyINode {
  // non-leaf node
  kind: LushTokenKind
  type: TokenTypeName
  tokenIdx: number
  text?: string
//  ref?: InputToken
  kids?: SusyNode[]
  x?: number
  completion?: CompletionTokenMetadata
}

type SusyLeaf = SusyINode & { text: string }
type SusyNode = SusyINode | SusyLeaf
type SusyLn = SusyNode[]
type SvelteNode = Omit<SusyNode, "kind"> & { kind: "svelte" }
type SvelteINode = Omit<SusyINode, "kind"> & { kind: "svelte" }
type SvelteLeaf = Omit<SusyLeaf, "kind"> & { kind: "svelte" }
```
