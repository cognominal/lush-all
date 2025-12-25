# YAML hybrid adapter proposal (draft)

## Goal

Define a hybrid adapter that routes mixed collection entries to a target
object’s `set` and `push` methods. Compatibility mode is out of scope.

## Summary

- Add a `YAMLHybrid` node type that can contain both mapping pairs and
  sequence items.
- Register a tag with method metadata in the schema (not in YAML content).
- On parse, the tag’s `resolve` creates the target object and uses the
  adapter to apply each item.
- On stringify, the tag’s `createNode` converts the object back to a
  `YAMLHybrid` node.

## Design

### Tag metadata



```ts
type HybridTagConfig = {
  tag: string
  class: new () => unknown
  setMethod: string
  pushMethod: string
}
```

Example config:

```ts
const hybridTags: HybridTagConfig[] = [
  {
    tag: '!dom',
    class: DomElement,
    setMethod: 'setAttr',
    pushMethod: 'appendChild'
  },
  {
    tag: '!whatever',
    class: WhateverClass,
    setMethod: 'put',
    pushMethod: 'addItem'
  }
]
```

### Hybrid adapter

The adapter calls the configured methods on the target object.

```ts
class HybridAdapter {
  target: unknown
  setMethod: string
  pushMethod: string

  constructor(target: unknown, setMethod: string, pushMethod: string) {
    this.target = target
    this.setMethod = setMethod
    this.pushMethod = pushMethod
  }

  set(key: unknown, value: unknown) {
    const fn = (this.target as any)[this.setMethod]
    if (typeof fn !== 'function') throw new Error('Missing set method')
    fn.call(this.target, key, value)
  }

  push(value: unknown) {
    const fn = (this.target as any)[this.pushMethod]
    if (typeof fn !== 'function') throw new Error('Missing push method')
    fn.call(this.target, value)
  }
}
```

### Tag resolve (parse)

The tag uses the adapter to apply mixed entries from a `YAMLHybrid` node.

```ts
const hybridTag = (cfg: HybridTagConfig) => ({
  tag: cfg.tag,
  collection: 'hybrid',
  resolve(node, onError) {
    if (!isHybrid(node)) {
      onError('Expected hybrid collection')
      return node
    }

    const target = new cfg.class()
    const adapter = new HybridAdapter(target, cfg.setMethod, cfg.pushMethod)

    for (const item of node.items) {
      if (isPair(item)) adapter.set(item.key, item.value)
      else adapter.push(item)
    }

    return target
  }
})
```

### Tag createNode (stringify)

The tag creates a `YAMLHybrid` node from the object instance.

```ts
const hybridTag = (cfg: HybridTagConfig) => ({
  // ...
  identify: (value: unknown) => value instanceof cfg.class,
  createNode(schema, value, ctx) {
    const v = value as any
    const { mapEntries, seqItems } = v.toHybridParts()
    return YAMLHybrid.from(schema, mapEntries, seqItems, ctx)
  }
})
```

### Registering tags

Tags are registered via schema configuration.

```ts
const customTags = hybridTags.map(hybridTag)
const doc = new Document()
doc.schema = new Schema({ customTags })
```

## Notes

- There is no `require` hook in yaml/. Use `resolve` and `createNode`.
- Inline YAML metadata like `!Class { set: x, push: y }` is possible but
  requires a special wrapper tag and a custom resolver.
- The hybrid collection type is a non-spec extension and will not be
  interoperable with other YAML parsers.
