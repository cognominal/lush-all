import { describe, expect, test } from 'bun:test'
import { susyYamlProjection, type SusyNode } from './index'
import { projectTree } from '../svelte-codemirror/src/projection'

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

  test('projects YAML text without losing punctuation', () => {
    const source = ['root:', '  - alpha', '  - beta', 'child: 1'].join('\n')
    const root = susyYamlProjection(source)
    const projection = projectTree(root)
    expect(projection.text).toBe(source)
  })

  test('marks CST tokens for punctuation', () => {
    const source = ['root:', '  - alpha', 'child: 1'].join('\n')
    const root = susyYamlProjection(source)
    const types: string[] = []
    const cstFlags: boolean[] = []
    const walk = (node: SusyNode) => {
      types.push(node.type)
      if (node.isCstToken) cstFlags.push(true)
      if (node.kids) node.kids.forEach(walk)
    }
    walk(root)
    expect(types).toContain('seq-item-ind')
    expect(types).toContain('map-value-ind')
    expect(cstFlags.length).toBeGreaterThan(0)
  })
})
