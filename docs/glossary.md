
# Glossary: Posh & Embedded Projectional Editing

## Model

The central, single source of truth representing the program's logic and data.
It is a structured collection of nodes (the astre) that exists independently of
how it is displayed. Changes to the model are immediately reflected in all its
projections.

## Astre (Augmentable Syntax Tree  Reference Representation) — *Lush-specific*

**Astre** is the canonical, authoritative  tree-based representation of
a program in Lush.

Astre is:

* an AST augmented with **stable identities**
* enriched with **structural references** (node and symbol identities)
* annotated with **lineage metadata** (parent/origin links)

Astre is:

* the source of truth
* the unit of serialization
* the basis for diffing, refactoring, and code generation

**Relation to standard terminology:**
Astre corresponds to **AST + IR + identity layer**, unified into a single model.

## Astre serialisation

The serialisation is the act of persisting an Astre in yaml.

## Vanilla language

In a vanilla language, a source program is a string of chars which
respects
the syntax of the language.
This source is the reference representation of the
program. As the lush project advances, we design posh susy representations

## Structural token

Before a computer builds a tree, it needs to break a long string of text
into "meaningful chunks."
These are tokens. While most tokens represent values (like x or 10), structural
tokens are the characters that define the hierarchy and boundaries of the code.

## Embedding

The practice of nesting one language or model directly inside another. In
projectional editors, this is seamless because nodes from different languages
can coexist in the same AST without syntax conflicts.

## Posh, short for  Posh Projection

A projection style where font styling (bolding, italics, colors, sizes, and
weights) serves as the primary notation. Instead of using symbols like brackets
or keywords, "Posh" uses visual weight to define scope and hierarchy.

## Two-Level Embedding (Enhanced YAML)

A specific implementation where a data-centric model (like YAML) acts as a host
for a logic-level. This allows for interpolating variables directly into a
structured data tree.

## Abstract Syntax Tree (AST)

The underlying data structure. In an embedded context, the AST becomes a
heterogeneous tree where nodes may belong to different schemas (e.g., a YAML
node containing a Python expression node).

## Concrete Syntax Tree (CST)

A Concrete Syntax Tree, also known as a Parse Tree, is a high-fidelity
representation of the source code. It captures every single detail present
in the source, including those structural tokens mentioned above.

## Structural Editing

Manipulating the AST directly. In "Posh" mode, the user interacts with styled
text blocks; though it looks like "rich text" editing, every font change
corresponds to a structural change in the model.

## Projectional Editor

An IDE or editor where users evolves an Astre by editing
its projection. Unlike text editors, there is no parsing of raw text
except for the initial conversion. The
UI renders the model based on defined rules.

## Projection

## Susy

The result of a projection
