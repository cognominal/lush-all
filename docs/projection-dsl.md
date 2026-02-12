# Projection DSL

This document describes the ruleproj DSL as it is implemented now in this
repository.

Implementation references:

- `/Users/cog/mine/lush-all/lush-types/ruleproj.ts`
- `/Users/cog/mine/lush-all/lush-types/susy-svelte-leste-projection.ts`

## Implemented Now

### Scope

The current implementation supports a runtime-interpreted projection pipeline
for Svelte HTML-like nodes:

1. Parse Svelte source.
2. Normalize into a small Astre shape (`Fragment`, `Element`, `Text`).
3. Parse `.ruleproj` text into rules.
4. Match rules in order (first match wins).
5. Emit Leste Susy tokens.

This is an interpreter path. There is no code generation step from `.ruleproj`
to TypeScript in the current implementation.

### Rule File Structure

A rule file is indentation-based and uses these sections:

- `rule <Name>`
- `match`
- `emit`

Example:

```ruleproj
rule Text
  match
    type: Text
    data: $text
  emit
    line: text($text)
```

### Match Fields

Supported `match` keys:

- `type`
- `name`
- `data`
- `attrs`
- `children`
- `where`

Value forms:

- Literal: `type: Text`
- Capture: `type: $nodeType`

### Where Predicates

Supported `where` predicates:

- `inlineTag($capture)`
- `blockTag($capture)`

Notes:

- The argument must be a capture reference.
- Predicate names are fixed to the two forms above.

### Emit Forms

Supported `emit` structure:

- `line: <emit-expr>`
- Optional `block` plus `each: $capture`

Supported emit expressions:

- `tag($name)`
- `text($text)`
- `inlineTag($name, $kids)`
- `tagWithAttrs($name, $attrs)`
- `inlineTagWithAttrs($name, $attrs, $kids)`

If `block` is present, `each:` is required and must reference a capture.

### Runtime Behavior

- Rules are tried in file order.
- The first matching rule is used.
- If no rule matches a node, children are traversed when available.
- Emission creates Leste tokens of types:
  - `tag`
  - `NakedString`
  - `Space`

### Current Svelte Rule Set Example

`/Users/cog/mine/lush-all/lush-types/projections/svelte-leste.ruleproj`:

```ruleproj
rule ElementBlock
  match
    type: Element
    name: $name
    attrs: $attrs
    children: $kids
    where: blockTag($name)
  emit
    line: tagWithAttrs($name, $attrs)
    block
      each: $kids

rule ElementInline
  match
    type: Element
    name: $name
    attrs: $attrs
    children: $kids
    where: inlineTag($name)
  emit
    line: inlineTagWithAttrs($name, $attrs, $kids)

rule Text
  match
    type: Text
    data: $text
  emit
    line: text($text)
```

### Known Limits

- No `kt` field support.
- No boolean expression language in `where`.
- No helpers like `join`, `indent`, `fitsInline`, `count`, `expr`, `attr`.
- No `node:` / `text:` / `when:` directives in `emit`.
- No macro system (quote/unquote/hygiene).
- No `.ruleproj` to `.ts` compiler step.

## Future Ideas

The items below are design goals, not implemented behavior.

- Broaden the DSL from Svelte HTML subset to more languages and node kinds.
- Add richer `where` expressions and helper functions.
- Add additional `emit` directives such as `node`, `text`, and conditional
  branches.
- Support inline-vs-block heuristics (for example size-based guards).
- Add macro-like templating features if needed.
- Add a compilation pipeline that generates TypeScript from `.ruleproj`.
- Dogfood projection for `.ruleproj` itself, including an Astre/YAML form.
