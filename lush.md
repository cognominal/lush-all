
# Lush concepts

This doc is the entry point to document lush.

## Docs


For the installation, see [README.md](./README.md)
There is a master [plan](./plan.md). The current file is a hub
to branch into many specifics subproject.
Once we get the doc browser into a satisfyting state.
Our effort will go to the structural editor by using
subset of lush as experimental ground (huffing html, id and class attributs)

We have now a [glossary](./glossary.md).
Codex writes a list of [progress](./progress.md) day by day.
[Search](./svelte-app/search.md) describe the effort to make the docs searchable
using the [docs](./docs/) route. Probably an effort should be made to
separate the user docs and the dev docs.
Effort on a [palette](/svelte-app/palette.md) similar to the vscode one
is on going.
[Playground] describes how svelte.dev implements svelte file edition and
the display of the corresponding app and how we could adapt it to
create our notebooks.
[lyaml](/yaml/spec3.md) describe how to evolve the yaml
library [1](https://github.com/eemeli/yaml) [2](https://eemeli.org/yaml/#yaml)
to huff shiva objects. This will break compatibility with existing yaml parsers.

## Lush terminology

Currently the doc is more geared toward a putative developer
than a putative user.

We use **vanilla susy** for the standard syntactic conventions of a language
and **custom susy** for adapted conventions. We call **posh susy** (or **posh**
as a noun) the version where font styling is part of the syntax itself. In
posh, style is a primary notation, not a secondary layer like syntax or
semantic highlighting.

A `susyed` is an editor or an editor mode suitable to edit susys.

## Benefit and cost of poshing

Poshing removes the need for reserved keywords: keywords are recognized by
poshing. String interpolation does not require special quoting or syntax
markers either; poshing carries that information

The cost of custom susys and poshing is an adapted ecosystem. We call an editor
that can work with these conventions a **susyed**.

## UI for lushed

We currently implement lushed using codemirror. But we want a logic independant
of the UI used. We hope to eventually support a TUI (we did in rdline/lush),
in nvim (but that would involve using lua) and monaco/vscode.

It supports a palette a la vscode to launch commands.

## The structure of the monorepo

The scripts, package and dependancies are documented [here](/package.json.md)

## The generated apps

There is a svelte app run by `bun run dev` (dev version) at the root of the
monorepo.
See

### the route of the apps

See [routes](svelte-app/routes)

## Lush is a resource for its own development

## Data structures for lushed

They are independant of the GUI or the TUI.

Lushed, our susyed, is a mostly structural editor that updates an underlying
AST. An instance of the `SusyEd` interface stores the data for a lushed.

Note: SusyEd replaces the previous multiline editor state. (REVIEW) `SusyNode`
has
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
//  ref?: SusyNode
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

## Structural editing conventions

The structural editor uses a SusyNode tree as the canonical source of truth
and derives all editor views from it.

- Canonical state is a rooted SusyNode tree, with a lines view derived from
  leaf tokens.
- Editable tokens are SusyTok nodes; currently treat SusyLeaf as SusyTok
  unless specified otherwise.
- Navigation is in document order (DFS left-to-right) over SusyTok nodes.
- Normal mode focuses a whole SusyTok span; insert mode edits only within the
  focused token text.
- Cursor movement in insert mode is constrained to the focused token's text
  range.
- Any edit in insert mode updates the current token text, then the text
  projection and span mapping are recomputed.
- Empty-text tokens may exist; they are focusable for navigation but render an
  empty string.

### Scope and goal

The structural editor exposes a token-tree projection, navigation, and
highlighting model, then plugs into UI layers like CodeMirror or a TUI.
The UI is a view and input surface; the token tree is the source of truth.

### Terminology

- Token node: a SusyNode instance.
- Leaf token: a SusyLeaf/SusyTok node (no kids).
- SusyTok (editable token): tokens eligible for direct text entry.
- Token path: an address from root to a node, e.g. array of indices [2, 0, 5].
- Current token: the token that is currently focused for navigation/editing.
- Cursor: an offset within a token's text (insert mode only).

### UI layer strategy

CodeMirror (or a TUI) is used for rendering text, handling input, and showing
selection/caret. The canonical state remains the SusyNode tree, and the UI
content is a projection of that tree to a string plus spans.

### Projection rules

Leaf token:

- output = token.text ?? ""

Non-leaf token:

- output = concatenation of each child projection.
- default separator is a single space between siblings only if both siblings
  project to non-empty strings.

### Span mapping

For each token node, compute a span in the projected string:

- from: start offset in projected string
- to: end offset in projected string (exclusive)
- for leaf tokens, also track textFrom/textTo that match token.text

This mapping is recomputed whenever the token tree changes.

### Highlighting and styles

Highlighting uses a YAML mapping file:

- key: lower(kind) + "." + lower(type) (e.g. "js.keyword")
- value: a Chalk-style chain like bold.blue or italic

Interpret the chain into CSS classes or inline styles in the browser:

- bold -> font-weight: 700
- italic -> font-style: italic
- underline -> text-decoration: underline
- colors -> CSS color tokens or vars

Precedence rules:

- kind.type
- kind.*
- *.type
- default token styling

### Navigation

Navigation is over SusyTok nodes in DFS left-to-right document order:

- Tab moves focus to the next SusyTok.
- Shift+Tab moves focus to the previous SusyTok.
- When moving to a non-leaf focus target, select the nearest SusyTok in its
  subtree.

### Insert mode edits

Insert mode edits only the current SusyTok text:

- Printable characters insert at cursorOffset.
- Cursor cannot move outside the current token's text span.
- If a token has empty text, keep it focusable but render an empty string.

### TUI-oriented state shape

The TUI version keeps SusyLines plus a JS view:

- State: { lines: SusyLines; jsView: SusyLines; cursor: { lineIdx; colIdx } }
- Primary text derives from lines via lineToText.
- JS view is rebuilt by parsing YAML to JS then util.inspect -> SusyLines.

### TUI editing behaviors

- Return inside a sequence item splices an empty array item after the line.
- Event helpers insert text, normalize positions, and move the cursor to the
  new line start.
