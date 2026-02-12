import { describe, expect, test } from 'bun:test'
import { projectTree } from '../svelte-codemirror/src/projection'
import { susyTsProjection, type SusyNode } from './index'

// Collect every node in depth-first order.
function flattenNodes(node: SusyNode, out: SusyNode[] = []): SusyNode[] {
  out.push(node)
  if (Array.isArray(node.kids)) {
    for (const child of node.kids) flattenNodes(child, out)
  }
  return out
}

describe('susyTsProjection', () => {
  test('keeps leading comments as ts.Comment with stripped delimiters', () => {
    const source = ['// top comment', '/* block comment */', 'if (1) {', "  console.log('ok')", '}'].join('\n')
    const root = susyTsProjection(source)
    const projection = projectTree(root)
    const nodes = flattenNodes(root)
    const commentNodes = nodes.filter((node) => node.type === 'Comment')

    expect(commentNodes.length).toBeGreaterThanOrEqual(2)
    expect(commentNodes.map((node) => node.text)).toContain(' top comment')
    expect(commentNodes.map((node) => node.text)).toContain(' block comment ')
    expect(projection.text.startsWith(' top comment\n block comment \n')).toBe(true)
    expect(projection.text.includes('if 1')).toBe(true)
  })

  test('stores x offsets in projected coordinates', () => {
    const source = ['// c', 'if (1) {', "  console.log('ok')", '}'].join('\n')
    const root = susyTsProjection(source)
    const projection = projectTree(root)
    const nodes = flattenNodes(root)
    const numberNode = nodes.find((node) => node.text === '1')

    expect(numberNode).toBeDefined()
    expect(numberNode?.x).toBe(projection.text.indexOf('1'))
  })
})
