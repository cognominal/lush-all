# YAML hybrid map+seq proposal

## Goal

Support "objects" with both map and array nature in the yaml/ package
without changing YAML syntax except for tags. Primary example: DOM elements with attributes
(map) and children (array). Obviously this breaks compatibility with existing parsers.

How to specify the methods to create an object for a given tag ?
that is to push an new entry to the array part, and add a new entry to
a map ? What are the methods anyway for an html element

By mixing collection, I mean interspacing map entries and array entry. 
Obviously the whole point of the feature is to support with a concise syntax
objects that have both the array and the map nature like DOM element


## Recommended design

Use a custom tag that is applied to a mapping, with a reserved key for
children. This keeps YAML valid and interoperable.

Example YAML:

That would be a fallback option to keep compatibilty with existing yaml parsers.

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

But the default with the modified parser is to support 

```yaml
!dom
name: div
  id: root
  class: [box, primary]
  - "Hello"
    name: span
      class: [label]
      - "world"
```

Note that the

### Tag behavior in compatibility mode

- Tag: `!dom`
- Collection type: map
- Required keys: none (defaults allowed)
- Reserved keys:
  - `children`: array of child nodes
  - `attrs`: attribute map
  - `name`: element/tag name

### Hybrid object class

- Use a JS/TS class (e.g. `DomElement`) to represent the hybrid object.
- Map-like fields are `name` and `attrs`.
- Array-like field is `children`.
- The class provides accessors for both parts and is used for stringify.

### Parsing (resolve)

- When the parser sees `!dom` on a mapping, it resolves the mapping into a
  `DomElement` instance.
- The resolver should emit a warning if the mapping mixes map entries and
  array-style entries. For example:
  - Numeric keys in the mapping ("0", "1", ...) or explicit `-` entries
    are treated as mixing.
  - The warning is best-effort and non-fatal.

### Stringifying (createNode)

- When stringifying a `DomElement`, emit a mapping with `name`, `attrs`, and
  `children`.
- Do not emit mixed map+seq entries.
- If `children` is empty, omit it for brevity (optional).

## Warning policy

- The parser should warn (not error) when it detects mixed usage in a
  `!dom` mapping.
- This keeps the default YAML behavior strict while allowing a clear path
  for hybrid objects.

## Implementation targets (yaml/)

- Add a new custom tag definition in `yaml/src/schema/custom/dom.ts`.
- Register the tag in schema creation (or add to `customTags` when building
  a Document).
- Implement `DomElement` class in the same file or a dedicated module.
- In `resolve`, detect mixed usage and call `onError` with a warning code.

