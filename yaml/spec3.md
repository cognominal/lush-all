# YAML hybrid adapter proposal (inline method names)

## Goal

Define a hybrid adapter that routes mixed collection entries to a target
object’s `set` and `push` methods, where the method names are specified
inline in YAML. The first tagged node defines behavior for its subtree;
child nodes inherit unless an explicit tag overrides it.

## Summary

- Add a `YAMLHybrid` node type that can contain both mapping pairs and
  sequence items.
- Allow method metadata to be specified inside the YAML node itself.
- The first instance of a tag defines the behavior for the subtree.
- On parse, read `module`, `className`, `set`, and `push` from the YAML
  content, then create an
  adapter to apply mixed entries.
- On stringify, include `module`, `className`, `set`, and `push` in the
  YAML output.

## Inline method metadata

Method names are declared in the YAML content alongside other entries. The
first tagged node defines the class and methods used for descendants.

Example YAML:

```yaml
!dom { module: foo/bar@1.17, className: HTMLElement, set: setAttr, push: appendChild }
name: div
- "Hello"
  name: span
  - "world"
```

## Adapter behavior

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

## Tag resolve (parse)

The tag reads `module`, `className`, `set`, and `push` from the first
tagged YAMLHybrid node. Descendants inherit this behavior unless an
explicit tag overrides it.

```ts
const domTag = {
  tag: '!dom',
  collection: 'hybrid',
  resolve(node, onError) {
    if (!isHybrid(node)) {
      onError('Expected hybrid collection')
      return node
    }

    let moduleName = ''
    let className = ''
    let setMethod = 'set'
    let pushMethod = 'push'

    for (const item of node.items) {
      if (isPair(item)) {
        if (item.key === 'module') moduleName = String(item.value)
        else if (item.key === 'className') className = String(item.value)
        else if (item.key === 'set') setMethod = String(item.value)
        else if (item.key === 'push') pushMethod = String(item.value)
      }
    }

    const target = loadClass(moduleName, className)
    const adapter = new HybridAdapter(target, setMethod, pushMethod)

    for (const item of node.items) {
      if (isPair(item)) {
        if (
          item.key === 'module' ||
          item.key === 'className' ||
          item.key === 'set' ||
          item.key === 'push'
        ) continue
        adapter.set(item.key, item.value)
      } else {
        adapter.push(item)
      }
    }

    return target
  }
}
```

## Tag createNode (stringify)

Include `module`, `className`, `set`, and `push` fields in the output YAML
so method names are preserved in the document.

```ts
const domTag = {
  // ...
  identify: (value: unknown) => isHybridTarget(value),
  createNode(schema, value, ctx) {
    const v = value as any
    const {
      mapEntries,
      seqItems,
      moduleName,
      className,
      setMethod,
      pushMethod
    } = v.toHybridParts()
    return YAMLHybrid.from(schema, {
      module: moduleName,
      className,
      set: setMethod,
      push: pushMethod,
      ...mapEntries
    }, seqItems, ctx)
  }
}
```

## Notes

- There is no `require` hook in yaml/. Use `resolve` and `createNode`.
- Inline method names are treated as reserved keys; they are not passed
  through to `set`.
- The class name in the example is `HTMLElement`, not a DOM node name.
- `loadClass` should load from the specified module and construct an
  instance of the class name; its implementation is host-specific.
- This remains a non-spec extension and will not be interoperable with
  other YAML parsers.

## Module loading and validation

Arbitrary modules cannot be loaded safely without explicit wiring. The
tag should be configured with a loader interface and a strict allowlist.

### Loader interface

Add an optional schema-level hook used by hybrid tags:

```ts
type HybridClassLoader = (spec: {
  module: string
  className: string
}) => { new (): unknown }

type HybridLoadPolicy = {
  allowlist: Array<{ module: string; className: string }>
  loadClass: HybridClassLoader
  validateInstance: (instance: unknown, set: string, push: string) => boolean
  onFailure: 'warn-and-fallback' | 'error'
}
```

### Resolution flow

1) Parse the first tagged node and read `module`, `className`, `set`, `push`.
2) Verify `{ module, className }` is present in `allowlist`.
3) Call `loadClass` with `{ module, className }` to get the constructor.
4) Instantiate with `new` and validate with `validateInstance`.
5) If validation fails, either warn and return the raw `YAMLHybrid` node,
   or throw, based on `onFailure`.

### Example validation rule

```ts
const validateInstance = (instance: unknown, set: string, push: string) => {
  const v = instance as Record<string, unknown>
  return typeof v[set] === 'function' && typeof v[push] === 'function'
}
```
