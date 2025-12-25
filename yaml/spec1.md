# YAML hybrid map+seq proposal (draft)

## Goal

Support "objects" with both map and array nature in the yaml/ package.
Primary example: DOM elements with attributes (map) and children (array).

This document assumes two modes:

- Compatibility mode: valid YAML using a mapping + `children`.
- Hybrid mode: a modified parser that allows mixed map and seq entries
  within a single collection.

## Inconsistencies in `yaml/spec.md`

- It claims "without changing YAML syntax" but later says the feature
  "breaks compatibility with existing parsers". Those statements conflict.
- It proposes a hybrid syntax example that is not valid YAML as written.
  The example mixes mapping keys and sequence items without a valid
  collection structure.
- It says to "emit a warning if the mapping mixes map entries and
  array-style entries" while also proposing a default mode that allows
  mixing. The warning policy must differ by mode.
- It references a "require method" for tags, but yaml/ uses `resolve`
  (parse) and `createNode` (stringify). There is no `require` hook.

## Recommended design (compatibility mode)

Use a custom tag applied to a mapping, with a reserved key for children.
This keeps YAML valid and interoperable.

Example YAML:

```yaml
!dom
name: div
attrs:
  id: root
  class: [box, primary]
children:
  - 'Hello'
  - !dom
    name: span
    attrs:
      class: [label]
    children: ['world']
```

### Tag behavior (compatibility mode)

- Tag: `!dom`
- Collection type: map
- Required keys: none (defaults allowed)
- Reserved keys:
  - `children`: array of child nodes
  - `attrs`: attribute map
  - `name`: element/tag name

### Hybrid object class

Use a JS/TS class to represent the hybrid object and provide clear
accessors for both parts.

```ts
class DomElement {
  name: string
  attrs: Record<string, unknown>
  children: unknown[]

  constructor(name: string, attrs: Record<string, unknown>, children: unknown[]) {
    this.name = name
    this.attrs = attrs
    this.children = children
  }

  appendChild(child: unknown) {
    this.children.push(child)
  }

  setAttr(key: string, value: unknown) {
    this.attrs[key] = value
  }
}
```

### Parsing hook (resolve)

In yaml/, custom tags use `resolve` for parsing. There is no `require` hook.

```ts
const domTag = {
  tag: '!dom',
  collection: 'map',
  resolve(map, onError) {
    if (!isMap(map)) {
      onError('Expected a mapping for !dom')
      return map
    }
    const name = map.get('name') ?? 'div'
    const attrs = (map.get('attrs') ?? {}) as Record<string, unknown>
    const children = (map.get('children') ?? []) as unknown[]
    return new DomElement(String(name), attrs, children)
  }
}
```

### Stringify hook (createNode)

Use `createNode` (or `nodeClass.from`) to map a DomElement back to YAML.

```ts
const domTag = {
  // ...
  identify: (value: unknown) => value instanceof DomElement,
  createNode(schema, value, ctx) {
    const el = value as DomElement
    return YAMLMap.from(schema, {
      name: el.name,
      attrs: el.attrs,
      children: el.children
    }, ctx)
  }
}
```

## Hybrid mode (non-spec)

Hybrid mode requires parser changes to allow mixed map and seq entries in a
single collection. This breaks compatibility with other YAML parsers.

### Proposed hybrid syntax (illustrative, not valid YAML)

```yaml
!dom
name: div
id: root
class: [box, primary]
- "Hello"
- !dom
  name: span
  class: [label]
  - "world"
```

If hybrid mode is implemented, it should:

- Prefer map-only or seq-only collections by default.
- Emit a warning when a collection mixes map and seq entries unless the
  tag explicitly opts into mixing.

### Tag hooks in hybrid mode

There is still no `require` hook. Use the same `resolve` and `createNode`
interfaces, but the parsed node class would be a new `YAMLHybrid` that
accepts both pair and item nodes.

## Warning policy

- Compatibility mode: warn if `!dom` mapping includes mixed entries.
- Hybrid mode: warn only when mixing is not explicitly enabled by the tag.

## Implementation targets (yaml/)

- Add a new custom tag definition in `yaml/src/schema/custom/dom.ts`.
- Register the tag in schema creation (or add to `customTags` when building
  a Document).
- Implement `DomElement` class in the same file or a dedicated module.
- In `resolve`, detect mixed usage and call `onError` with a warning code.
- If hybrid mode is pursued, add `YAMLHybrid` node type and update compose
  and stringify paths.
