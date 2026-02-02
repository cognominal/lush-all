import { describe, expect, test } from 'bun:test'
import { susyYamlProjection, type SusyNode } from './index'

// Collect Susy node types in a tree.
function collectTypes(node: SusyNode, types: string[] = []): string[] {
  types.push(node.type)
  if (Array.isArray(node.kids)) {
    for (const child of node.kids) collectTypes(child, types)
  }
  return types
}

describe('susyYamlProjection', () => {
  test('uses YAML AST node names', () => {
    const source = ['root:', '  - alpha', '  - beta', 'child: 1'].join('\n')
    const root = susyYamlProjection(source)
    const types = new Set(collectTypes(root))
    expect(types.has('Document')).toBe(true)
    expect(types.has('YAMLMap')).toBe(true)
    expect(types.has('Pair')).toBe(true)
    expect(types.has('YAMLSeq')).toBe(true)
    expect(types.has('Scalar')).toBe(true)
  })
})
