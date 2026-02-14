# Editing in lushed

See [glossary](/docs/glossary.md) for the vocabulary.

Currently lushed is mostly read only so it renders an astre into
a readonly susy.
We specify here how we will make it a real structural editor.

A susy is implemented as a tree of `SusyNode`s.
Nodes that can be placeholder will have a list of
supported snippets.
We will define here what new fields are needed in `SusyNode`s

## Snippets

There will be a file (or files) defining snippets
We will specify here how to define a snippet.

## Placeholder

A node that supports placeholder mode is in that mode
when it is empty.

## Expression parser

Structural edition of expressions would be a nightmare
with or without snippets. We want an expression parser
a la raku.
We will start by supporting only literals
and variables on expression placeholders.
