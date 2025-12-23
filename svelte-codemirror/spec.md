# structural-editing.md

## Changes to be implemented

- now also a component
- an edit command in the palette will allow to choose the file to be edited.
- use freedesktop conventions to store the yaml files that drive the editor.

- When the implementation changes, link to the implementation function must
  be updated

## 1. Objective

Write a package in the current monorepo folder.
Use lush-type/
This package will is used to implement a new page with route `/editor` using
a new `editor` component.
It will contain a five line js sample file as an InputToken tree highlighted as specified below.
Any js keyword will be a js.keyword as per the yaml file.
Other alphanumerics starting by a letter will be a js.variable.

Implementation: `createSampleJsTree` builds the five-line sample token tree in
[svelte-codemirror/src/sample.ts](svelte-codemirror/src/sample.ts) (function:
[createSampleJsTree](svelte-codemirror/src/sample.ts#L25)).

### Updated objective (reformulated)

Build a reusable structural-editing package (based on `lush-types`) that exposes a
token-tree projection, navigation, and highlighting model, then integrate it into
a SvelteKit page that renders a 5-line JavaScript sample with modal (normal/insert)
behavior using CodeMirror as the view layer.

### Integration with svelte-app/

- Add a new SvelteKit page at `src/routes/editor/+page.svelte`.
- Import the structural editor package from `svelte-codemirror/src` via a SvelteKit
  alias (e.g. `@lush/structural`) for clean, shared logic.
- Load `highlight.yaml` with `?raw`, parse it in the page, and pass its registry
  to the CodeMirror decoration builder.

Reformulate the updated objective.
Add to the current file information on how you will do the integration with
svelte-app/

Implement a structural editor as a SvelteKit page using CodeMirror as the view
layer, with a modal interaction model inspired by Vim:

- Normal mode for navigation across a structured token tree.
- Insert mode for editing the text of a single input token.

For now, only the keybindings specified in this document must be active.
Everything else should behave as inert text editing (i.e., do not allow
CodeMirror default keymaps to introduce extra behavior outside the defined
bindings).

The edited document is represented as a tree of InputToken nodes. Navigation
and editing must respect this structure.

Implementation: `serializePath`, `getTokenByPath`, `isLeaf`, and `isInputToken`
provide core tree utilities in
[svelte-codemirror/src/tree.ts](svelte-codemirror/src/tree.ts) (functions:
[serializePath](svelte-codemirror/src/tree.ts#L3),
[getTokenByPath](svelte-codemirror/src/tree.ts#L7),
[isLeaf](svelte-codemirror/src/tree.ts#L17),
[isInputToken](svelte-codemirror/src/tree.ts#L21)).

## 2. Core Data Model

The editor's canonical state is a rooted tree of InputToken:

```ts
export interface InputToken {
  kind: LushTokenKind
  type: TokenTypeName
  tokenIdx: number
  text?: string
  subTokens?: InputToken[]
  x?: number
  completion?: CompletionTokenMetadata
}
```

### 2.1 Terminology

- Token node: an InputToken instance.
- Leaf token: a token without subTokens or with subTokens.length === 0.
- InputToken (editable token): tokens eligible for direct text entry. In this
  version, treat leaf tokens as input tokens unless specified otherwise later.
- Token path: an address from root to a node, e.g. array of indices [2, 0, 5].
- Current token: the token that is currently "focused" for navigation/editing.
- Cursor: an offset within a token's text (insert mode only).

## 3. UI Layer Choice and Strategy

### 3.1 Why CodeMirror is used

CodeMirror is used as:

- a rendering surface (text + syntax highlighting),
- a keyboard input handler (via custom keymap),
- a selection/cursor display.

However, the document is not "plain text" as far as the editor is concerned.
The source of truth is the token tree.

### 3.2 Single source of truth

- Canonical state: InputToken tree.
- CodeMirror content: a projection of that tree to a string.

Any edits in insert mode must be re-applied back to the targeted token node,
then the projection is re-generated.

## 4. Highlighting via highlight.yaml

### 4.1 Format

A YAML mapping file defines styles for token categories:

- Key: lower(kind) + "." + lower(type) (i.e. "kind.type" in lowercase).
- Value: a Chalk-style "chain" string like bold.blue, italic, etc.

Example:

```yaml
js.keyword: bold.blue
js.variable: italic
```

Implementation: `parseHighlightYaml` parses the YAML mapping and
`createHighlightRegistry` provides the class lookup in
[svelte-codemirror/src/highlight.ts](svelte-codemirror/src/highlight.ts)
(functions: [parseHighlightYaml](svelte-codemirror/src/highlight.ts#L27),
[createHighlightRegistry](svelte-codemirror/src/highlight.ts#L72)).

### 4.2 Interpretation

This project is in the browser. Chalk is Node-oriented; therefore:

- Parse the Chalk chain string into a CSS class or inline style.
- Implement a small style registry:
  - bold -> font-weight: 700
  - italic -> font-style: italic
  - underline -> text-decoration: underline
  - colors (e.g. blue, red, gray, etc.) -> color: var(--cm-...) or direct CSS
    color tokens

Minimum viable mapping:

- support bold, italic, and basic named colors.
- unknown segments are ignored (do not crash).

### 4.3 Precedence and fallback

When applying a style to a token:

- Try exact key: kind.type.
- Try kind-only key: kind.* (optional, if present in YAML).
- Try type-only key: *.type (optional).
- Else: default token styling.

## 5. Tree-to-Text Projection

CodeMirror requires a string. The editor must define a deterministic
projection:

Implementation: `projectTree` builds the projection text plus span metadata in
[svelte-codemirror/src/projection.ts](svelte-codemirror/src/projection.ts)
(function: [projectTree](svelte-codemirror/src/projection.ts#L68)).

### 5.1 Projection rules (initial)

Leaf token:

- output = token.text ?? ""

Non-leaf token:

- output = concatenation of each child projection, with a separator policy:
  - default separator: single space " " between siblings only if both sibling
    projections are non-empty.

(This can later be replaced by grammar-aware formatting; for now it must be
stable.)

### 5.2 Source mapping

To support highlighting and restricted cursor movement, build a mapping:

For each token node, compute:

- from: start offset in projected string
- to: end offset in projected string (exclusive)

For leaf tokens, also track textFrom/textTo that correspond precisely to
token.text.

This mapping is recomputed whenever the token tree changes.

## 6. Editor State

Maintain a dedicated editor state object, separate from CodeMirror's internal
state:

```ts
type Mode = "normal" | "insert"

interface StructuralEditorState {
  mode: Mode
  root: InputToken

  // navigation
  currentPath: number[] // path to current token (focused)
  currentInputPath: number[] // path to current input token (leaf) used for Tab
  // navigation

  // insert-mode cursor inside current input token text
  cursorOffset: number // 0..len(text)

  // mapping derived from projection
  projectionText: string
  spansByPath: Map<
    string,
    { from: number; to: number; textFrom?: number; textTo?: number }
  >
}
```

Path keys in maps can be serialized as JSON ("[2,0,5]") or a compact string
("2/0/5"), but must be consistent.

## 7. Modes and Constraints

### 7.1 Insert mode

Behavior:

- Escape:
  - switch to normal mode
  - ensure CodeMirror selection/cursor snaps to the whole input token span or to
    a stable anchor (see below)
- Cursor movement is restricted to the current input token:
  - The user must not be able to move the caret outside the current input
    token's textFrom..textTo.
  - If CodeMirror selection changes outside allowed range, immediately clamp it
    back.
- Printable characters:
  - Insert "as is" at cursorOffset inside token.text.
  - Update cursorOffset accordingly.
  - Recompute projection + mapping.

Definition of "printable":

- A key event that produces a single Unicode character and is not combined with
  Ctrl/Meta/Alt.

Newlines: not specified; for now treat Enter as inactive in insert mode (no
insertion) unless explicitly required later.

### 7.2 Normal mode

Behavior:

- i:
  - switch to insert mode
  - set currentInputPath to:
    - the current token if it is an input token
    - otherwise the "nearest" input token in its subtree:
      - prefer first leaf in DFS order
  - set cursorOffset to end of token text (or 0; choose one and keep consistent;
    recommend end)
- Enter ("return"):
  - go one step deeper in the tree:
    - if current token has children: move to its first child (path + [0])
    - else: no-op
- Shift+Enter:
  - go one step deep in the tree (same behavior as Enter for now; keep both
    bindings wired distinctly so they can diverge later)
- Tab:
  - go to next input token in document order (DFS left-to-right).
  - update currentInputPath and currentPath to that token.
  - update CodeMirror selection to that token's span.
- Shift+Tab:
  - go to previous input token in document order.
  - update paths + selection similarly.
- Inactive keys:
  - All other keys do nothing (do not fall back to CodeMirror defaults).

## 8. Document Order and Navigation

### 8.1 Document order for input tokens

Define a function that lists all input tokens in DFS order:

- Visit node:
  - if leaf: include it
  - else: visit children in order
- Store the list as paths: inputTokenPaths: number[][].

Implementation: `findFirstInputPath`, `findNextInputPath`, `findPrevInputPath`,
and `descendPath` implement DFS navigation helpers in
[svelte-codemirror/src/navigation.ts](svelte-codemirror/src/navigation.ts)
(functions: [findFirstInputPath](svelte-codemirror/src/navigation.ts#L15),
[findNextInputPath](svelte-codemirror/src/navigation.ts#L31),
[findPrevInputPath](svelte-codemirror/src/navigation.ts#L40),
[descendPath](svelte-codemirror/src/navigation.ts#L49)).

### 8.2 "Next" and "Previous"

Given currentInputPath:

- Find index in inputTokenPaths.

Next:

- if at end: wrap or no-op?
  - For now: no wrap (no-op at boundaries).

Previous:

- if at start: no-op.

### 8.3 "Go one step deeper"

In normal mode:

- If current token has subTokens and length > 0:
  - currentPath = currentPath + [0]
- If the new current token is not an input token, selection should reflect the
  whole node span.
- If no children: no-op.

## 9. Selection and Cursor Display Policy

### 9.1 Normal mode selection

Normal mode should visually indicate the current focus token.

Policy:

- Set CodeMirror selection to [from, to] span of currentPath.
- Use a dedicated CSS class (e.g., .cm-structural-focus) applied via a
  decoration.

### 9.2 Insert mode cursor

Insert mode shows an actual caret inside the current input token:

- caret position = textFrom + cursorOffset.
- selection should be collapsed (anchor=head).

Additionally:

- Prevent multi-range selections.
- Prevent selection outside token.

## 10. CodeMirror Integration Requirements

### 10.1 Disable default keymaps

To ensure "only specified keybindings are active":

- Do not include standard CodeMirror keymaps (or override them with
  higher-precedence keymap that preventDefaults).
- Attach a custom keymap extension that:
  - intercepts specified keys and executes actions.
  - for any other key:
    - in normal mode: return true (handled; do nothing).
    - in insert mode:
      - if printable: handle insertion
      - else: return true (handled; do nothing)

### 10.2 External updates

Whenever the token tree changes:

- recompute projection text
- update CodeMirror document to match (replace entire content or apply minimal
  diff; start with full replace)
- recompute decorations for highlighting and focus spans

### 10.3 Highlighting implementation

Implement a decoration set:

- For every token span:
  - compute style class from highlight.yaml
  - apply as a mark decoration over [from, to]
- Keep focus decoration separate so it can override styling (e.g.,
  outline/background).

## 11. SvelteKit Page Structure

### 11.1 Files (suggested)

- src/routes/editor/+page.svelte
  - mounts CodeMirror
  - loads highlight.yaml
  - holds StructuralEditorState
- src/lib/structural/
  - projection.ts (tree->text, spans)
  - navigation.ts (DFS order, next/prev, descend)
  - highlight.ts (yaml parsing, chalk-chain->css)
  - keymap.ts (mode-aware handlers)
  - types.ts (InputToken + helper types)

### 11.2 Loading highlight.yaml

Options:

- Import as raw text (via Vite ?raw) and parse with a YAML parser.
- Or serve as static asset and fetch it.

Requirement:

- Parsing failure must not crash the editor; fallback to empty map.

## 12. Behavioral Edge Cases

### 12.1 Tokens with missing text

In insert mode, if the current input token has text === undefined:

- treat it as "" and initialize on first insertion.

### 12.2 Empty projection spans

Some tokens may project to empty strings.

For navigation (Tab / Shift+Tab), still allow focusing them if they are input
tokens, but:

- selection span is empty; provide a minimum-width caret marker decoration to
  show focus.

### 12.3 Non-leaf editable tokens (future-proofing)

The current spec defines input tokens as leaf tokens. If later expanded:

- add a predicate isInputToken(token): boolean and use it everywhere.

## 13. Acceptance Criteria

### 13.1 Modal behavior

- Pressing i in normal mode always enters insert mode.
- Pressing Esc in insert mode always returns to normal mode.
- In normal mode, typing letters does not modify content.
- In insert mode, printable characters modify only the current input token.

### 13.2 Cursor restriction

- In insert mode, the caret cannot move outside the current input token,
  regardless of mouse clicks or arrow keys.
- If the user attempts to place the caret elsewhere, it snaps back to the
  nearest valid offset inside the token.

### 13.3 Navigation

- Tab moves focus to the next input token in DFS order.
- Shift+Tab moves focus to the previous input token in DFS order.
- Enter descends to the first child if any.
- Shift+Enter behaves the same as Enter for now.

### 13.4 Highlighting

- Token spans are decorated according to highlight.yaml using keys kind.type
  lowercased.
- Unknown keys/styles do not crash and simply render with default styling.

### 13.5 Keybinding isolation

- No other CodeMirror keybindings (default behavior) should be active.
- Example: Ctrl+F, arrow keys, Backspace, etc. must do nothing unless later
  specified.

## 14. Implementation Plan (High-Level)

- Define helpers:
  - serializePath(path): string
  - getTokenByPath(root, path): InputToken
  - isLeaf(token) and isInputToken(token) (initially leaf)
- Projection:
  - project(root) -> { text, spansByPath, inputTokenPaths }
- Highlight loading:
  - load and parse YAML
  - build styleFor(kind,type)
- CodeMirror setup:
  - create editor with:
    - doc = projection.text
    - extensions:
      - custom keymap
      - decorations for highlighting
      - decorations for focus + insert caret rules
- Mode transitions:
  - enterInsertMode()
  - enterNormalMode()
- Navigation actions:
  - focusNextInputToken()
  - focusPrevInputToken()
  - descend()
- Insert action:
  - insertChar(ch)
  - update token.text
  - recompute projection + update CodeMirror
- Clamping enforcement:
  - listen to selection changes and clamp when in insert mode

## 15. Out of Scope (Explicitly Not Implemented Yet)

- Deletion/backspace behavior.
- Arrow-key movement (even within token).
- Structural transformations (wrap, splice, lift, etc.).
- Grammar-aware spacing/formatting beyond basic concatenation.
- Multi-cursor, multi-selection.
- Undo/redo semantics (beyond what naturally happens from re-rendering; define
  later).
