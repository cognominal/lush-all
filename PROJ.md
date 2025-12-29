
# Glossary — Lush (Integrated, Final Pass)

This glossary defines the technical vocabulary used in the **Lush** project.
Each term is marked as **standard** or **Lush-specific**, and Lush-specific terms are explicitly related to accepted terminology where relevant.

---

## AST (Abstract Syntax Tree) — *standard*

A tree-structured representation of a program that captures semantic structure independently of surface form (text, layout, typography).

---

## Astre (AST Reference Representation) — *Lush-specific*

**Astre** is the canonical, authoritative representation of a program in Lush.

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

---

## Susy (Surface Syntax) — *Lush-specific*

**Susy** is the projectional surface syntax of an Astre.

* Susy is derived from Astre, never parsed into it
* Editing Susy updates Astre immediately
* Susy uses multiple channels (indentation, font style) as **primary notation**

**Relation to standard terminology:**
Susy corresponds to **concrete syntax / surface structure**, but in a projectional (non-parsed) sense.

---

## Lush — *project name*

**Lush** is the language and system built around Astre (model) and Susy (projection), defining identity, channels, and projection rules.

---

## Lushed (Projectional Editor) — *Lush-specific*

**Lushed** is the projectional editor for Lush.

* Users edit Susy
* Lushed maintains Astre continuously
* Invalid intermediate states are structurally impossible

**Relation to standard terminology:**
Lushed is a **projectional editor**, comparable to Lamdu or JetBrains MPS, but with a text-like, indentation-oriented projection.

---

## Channel — *standard*

A **channel** is a distinct representational dimension through which meaning is conveyed.

Examples:

* characters
* indentation
* font style
* color
* spatial grouping

---

## Primary Channel — *standard*

A channel that carries semantic meaning. Removing or altering it changes interpretation.

In Lush:

* indentation → primary
* font style → primary

---

## Secondary Channel — *standard*

A channel that provides redundant or supportive cues without semantic force.

In Lush:

* color → secondary
* guides → secondary

---

## Channel Budget — *standard*

The finite set of channels available in a rendering environment.

Examples:

* GUI editor: large channel budget
* Terminal / TUI: restricted channel budget

---

## Indentation as Syntax — *standard*

A syntactic mechanism where hierarchical structure is encoded through indentation rather than delimiters.

In Lush:

* indentation is always semantic
* indentation is preferred for multi-line structures

---

## Font Style as Syntax — *Lush design choice*

A design where typographic attributes (bold, italic, monospace) are part of **primary notation**.

---

## Token — *redefined for Lush*

The smallest syntactic unit.

In Lush:

* a token is a **(string, style)** pair
* token meaning depends on channel values

---

## Primary Notation — *standard*

Notation that must be preserved to retain meaning.

---

## Secondary Notation — *standard*

Notation that aids comprehension but adds no meaning.

---

## Highlighting — *standard*

Visual styling for readability. Usually secondary.

---

## Lexical Highlighting — *corrected term*

Highlighting based on token class, not structure. Secondary notation.

---

## Syntactic Highlighting — *rare*

Highlighting derived from structural context. Usually still secondary.

---

## Structural Editing — *standard*

Editing operations that manipulate AST/Astre nodes rather than character sequences.

---

## Stable Node Identity — *standard*

Persistent identifiers attached to nodes that survive edits and refactorings.

---

## Structural Reference — *standard*

A reference by identity rather than by name or position.

---

## Aïd (Abstract Identifier) — *Lush-specific*

An **aïd** is a generic, opaque, stable identifier in Lush.

---

## Naïd (Node Aïd) — *Lush-specific*

A **naïd** uniquely identifies a node in Astre.

* Regenerated on clone or move
* Used for diffing and lineage

---

## Païd (Parent Aïd) — *Lush-specific*

A **païd** records the immediate ancestor of a naïd.

---

## Saïd (Symbol Aïd) — *Lush-specific*

A **saïd** identifies a symbol independently of its textual name.

---

## Lineage — *standard*

Ancestry relationships between nodes across transformations.

---

## Structural Diff — *standard*

Diffing based on identity and structure rather than text.

---

## Projection — *standard*

A rendering of Astre into a human-visible form.

---

## Projection Pipeline — *standard*

```
Astre (model + aïds)
  ⇄ Susy (projection)
  ⇄ Canonical serialization
  ⇄ Target AST (e.g. Acorn)
```

---

## Parser vs Generator — *standard*

* **Parser:** derives structure from text
* **Generator:** emits structure from a model

Lush uses **generation**, not parsing.

---

## JSON — *standard data format*

A text-based data serialization format with:

* unordered object keys
* no comments
* no duplicate keys
* no indentation-based semantics

**Usage in Lush:**

* machine interchange
* compact storage
* not suitable as surface syntax

---

## YAML — *standard data format*

A data serialization language with:

* indentation as syntax
* ordered sequences
* mappings with unique keys

**Usage in Lush:**

* inspiration for indentation-based projection rules
* suitable as a canonical serialization
* not used as Susy itself

---

## Collection Projection Rules — *Lush-specific*

In Susy, collections are projected according to size and fit:

* **Single-line fit:** rendered inline using `{}` or `[]`
* **Multi-line or overflow:** rendered using indentation as syntax

This mirrors YAML’s visual grammar but is applied **by projection**, not by parsing.

---

## GUI (Graphical User Interface) — *standard*

A rendering environment with rich channel support (font style, layout, color).

In Lush:

* GUI editors (e.g. Monaco, CodeMirror) are the primary hosts for Susy

---

## TUI (Text User Interface) — *standard*

A terminal-based UI with a restricted channel budget.

In Lush:

* used for degraded or auxiliary projections

---

## Terminal — *standard*

A grid-based, monospace rendering device.

* preserves indentation
* does not reliably preserve font style

---

## Acorn AST — *standard tool*

The JavaScript AST format produced by Acorn.

In Lush:

* generated from Astre
* augmented with stable identities

---

## Svelte Compiler Pipeline — *comparison*

Svelte generates ASTs and code but does not preserve stable node identity across edits.
Lush explicitly diverges here.

---

## Permanent Snippet — *Lush-specific*

A structural template that expands into Astre nodes with placeholders.

---

## Placeholder — *standard*

A typed hole in Astre intended to be filled later.

---

## Snippet Expansion (Projectional) — *standard*

Insertion of structure rather than text.

---

## Textual Snippet — *contrast*

Snippet expanding to text and relying on parsing.
