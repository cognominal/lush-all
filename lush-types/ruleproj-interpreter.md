# Ruleproj Interpreter Notes

## Purpose

This note explains where `.ruleproj` files are parsed and how they are
applied to render Leste tokens. It is scoped to the Svelte → Leste
projection path in `lush-types`.

## Where The Parser Lives

- Parser implementation: `lush-types/ruleproj.ts`
- Entry point: `parseRuleproj(ruleprojText: string)`

`parseRuleproj` turns the `.ruleproj` text into an array of rules. Each
rule contains:

- `match`: what AST nodes the rule applies to
- `emit`: how to render the matched node

The rule parser understands the custom ruleproj grammar (for example
`tagWithAttrs(...)`, `inlineTag(...)`, and `text(...)` in the emit clause).

## Where The Rules Are Applied

Rules are applied in `lush-types/susy-svelte-leste-projection.ts`.
This file does three major things:

1. Parse Svelte source into a normalized AST
2. Interpret `.ruleproj` rules against that AST
3. Emit Leste tokens (`NakedString`, `Space`, `tag`) as a Susy tree

The core rule application flow is:

- `susySvelteLesteProjection(source, ruleproj)`
  - `parseRuleproj(ruleproj)` produces `RuleprojRule[]`
  - `renderNode(html, rules)` walks the normalized AST
  - `renderEmitExpr(...)` turns a rule `emit` into tokens

## Rule Matching

Rule matching happens in `matchRule(rule, node)`:

- It checks required fields (type, name, data, attrs, children)
- It captures values into a map
- It handles inline vs block tag checks through `where`

If a rule does not match, the next rule is tried in order.

## Rule Emission

The emitted structures are interpreted by `renderEmitExpr(...)`:

- `tag(...)` emits a Leste `tag` token
- `text(...)` emits `NakedString` and `Space` tokens
- `tagWithAttrs(...)` emits a `tag` and attribute tokens
- `inlineTagWithAttrs(...)` emits a tag, inline kids, and closing tag

Emission returns a list of tokens (`LesteLine`).

## Layout And Spacing

Token lists are combined via `appendTokens(...)`:

- It merges tokens into a line
- It inserts a `Space` token when needed
- It avoids auto-spaces around `tag` tokens

That spacing logic is in the TS code, not in `.ruleproj`.

## Building The Susy Tree

After token emission, `buildSusyFromLines(...)`:

- Flattens all lines into a single token list
- Assigns `x` offsets
- Builds a `SusyNode` tree with `kids`

This is what downstream projection and rendering use.

## Why This Is Split

`.ruleproj` is responsible for the rendering rules.
The TS projection file is responsible for:

- Parsing and normalizing the source language AST
- Providing rule matches with consistent capture names
- Controlling layout and spacing behavior

If you want a more generic path, the likely refactor is:

- Move rule application (`renderNode`, `renderEmitExpr`) into a shared
  module
- Keep only language-specific AST normalization in each adapter

## Reference Files

- Rule parser: `lush-types/ruleproj.ts`
- Projection using rules: `lush-types/susy-svelte-leste-projection.ts`
- Rules file: `lush-types/projections/svelte-leste.ruleproj`

