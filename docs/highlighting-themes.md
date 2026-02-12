# Highlighting and Themes

This document explains how token highlighting works in the structural
editor and how to write theme rules.

## Files

- Engine:
  `/Users/cog/mine/lush-all/svelte-codemirror/src/highlight.ts`
- Default theme:
  `/Users/cog/mine/lush-all/svelte-codemirror/src/themes/default.yaml`

## Theme Format

A theme is a YAML map from selector keys to style chains.

Example:

```yaml
js.keyword: bold.blue
leste.tag: bold.underline.red
.keyword: bold.underline.red
```

The right side is a dot-separated style chain.

Supported style segments:

- `bold`
- `italic`
- `underline`
- Colors: `blue`, `red`, `green`, `yellow`, `gray`, `grey`, `cyan`,
  `magenta`, `white`, `black`

Unknown segments are ignored.

## Selector Keys

Selectors match `(kind, type)` from each `SusyNode`.

Supported selector forms:

- `kind.type`: exact match
- `kind.*`: wildcard on type within one kind
- `.type`: wildcard on kind (synonym of `*.type`)
- `*.type`: wildcard on kind

Matching precedence:

1. `kind.type`
2. `kind.*`
3. `.type`
4. `*.type`

If nothing matches, no highlight class is applied.

## Why `.type` and `*.type`

Both forms apply the same style to a token type across all kinds.
This is useful for cross-language styling.

Example:

```yaml
.keyword: bold.underline.red
```

This styles `keyword` tokens for `js`, `ts`, `svelte`, `leste`, or any
other kind that emits type `keyword`.

## Notes for TS tokens

TypeScript projection now emits scanner-typed leaves, including:

- `keyword`
- `variable`
- `operator`
- `punctuation`
- `number`
- `Space`

That means `.keyword` or `*.keyword` can style TS keywords directly.
