# language studio

See [glossary](/docs/glossary.md) for the vocabulary.

It is currently accessible the /editor route.

I wanted to write the lush editor and I ended up with
this language studio. Eventually the route will become `/language-studio`.
This dev path had the side effect of tying the lushed svelte component, Structural editor,
to others. That should be optional

## Purpose

It is a setup to help develop lushed and drivers for specific susys.
At this point we don't directly load programs from their astres but
generate a posh susy from a program expressed in a vanilla language.
We edit the posh susy in the lushed pane.
Currently the susy is mostly readonly.
Next we will embed vanilla language within each other.

The state is persisted in the browser so reopening the route  
opens the same vanilla source file with the same theming.

## Workflow

One loads a sample file and the lushed pane display its poshed susy

## Layout

We don't describe the menu bar at the top because it is part of the general layout,
not specific to the /editor route.

### On the right

We have the serialization of the susy in yaml. On top of it there
are two text field `indexer` and `filter` keys. EXPLAIN these two.

### On the left

We have a mode indicator which says if lushed is in insert mode or normal
mode. These mode are inspired from the eponymous nvim mode.

#### Theming and highlighting

Below we have an highlight section with two fields. The first is a drop down
that permit to chose the theme. The second is an editable text field that show
the rules to highlight the current node in lushed.

#### Picking a sample file

We have a set of sample files to experiment with.

### On the bottom : the breadcrumb bar

A breadcrumb bar allow to select nodes up the tree from the current node.
It will be horizontally scrollable.
Now it is in the left pane and make the UI dance when it goes to one line
to many.
