# susy-svelte-projection.ts

This module parses a Svelte file into a SusyNode tree and emits it as
YAML when run from the command line. It exports a function so other
modules can reuse the projection logic.

## Exports

- `susySvelteProjection(source, filename?)`: parses the Svelte source
  string, builds the SusyNode tree, assigns token indices, and returns
  the root node.

## CLI Usage

Run the file directly with Bun to print the YAML projection of a Svelte
file.

```
bun lush-types/susy-svelte-projection.ts path/to/file.svelte
```

If no path is provided, it uses `lk.svelte` in the current directory.

## loose spec

We want to project the svelte astre, an augmented acorn tree generated
by the svelte compiler
in a susie representation implemented as a SusyNode tree.
We don't care yet about rerendering in AAT an edited ITT.
Note that the ITT reorder the ATT attributes and its own node
for attributes of name `id` and class.

We will design incrementally.
We want to eventually drive the unparsing with a set of rules
using yaml.

For now we leave the js/ts part alone and focus on html  that
is stuff under tne nodes of type Fragment.

if a leste susy has many node at the same level.

{ "anchored": !local &A1 "value",
  "alias": *A1 }

```html
<h1 t="u" id="ud" class="class1 class2">Hello!</>

```

```leste
h1 #id .class1 .class2 t=u Hello

```

We want to represent the resulting tree as yaml

   IT:
     kind-type: leste.tag
     subTokens:
     ast:
        type: RegularElement
