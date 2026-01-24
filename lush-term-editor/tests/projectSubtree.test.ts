import { describe, expect, test } from 'bun:test'
import type { SusyNode } from 'lush-types'
import { projectTree } from '../../svelte-codemirror/src/projection.ts'
import { serializePath } from '../../svelte-codemirror/src/tree.ts'

// Build leaf tokens for projection tests.
const makeLeaf = (text: string, tokenIdx: number): SusyNode => ({
  kind: 'YAML',
  type: 'scalar',
  tokenIdx,
  text
})

// Build internal nodes for projection tests.
const makeNode = (kids: SusyNode[], tokenIdx: number): SusyNode => ({
  kind: 'YAML',
  type: 'document',
  tokenIdx,
  kids
})

describe('projectTree', () => {
  test('projects a leaf node into spans and tok paths', () => {
    const root = makeLeaf('alpha', 0)
    const projection = projectTree(root)

    expect(projection.text).toBe('alpha')
    expect(projection.spansByPath.get(serializePath([]))).toEqual({
      from: 0,
      to: 5,
      textFrom: 0,
      textTo: 5
    })
    expect(projection.tokPaths).toEqual([[]])
  })

  test('projects nested nodes with space insertion and offsets', () => {
    const root = makeNode(
      [
        makeLeaf('alpha', 0),
        makeNode([makeLeaf('beta', 1), makeLeaf('gamma', 2)], 3)
      ],
      4
    )
    const projection = projectTree(root)

    expect(projection.text).toBe('alpha beta gamma')
    expect(projection.spansByPath.get(serializePath([]))).toEqual({
      from: 0,
      to: 16
    })
    expect(projection.spansByPath.get(serializePath([0]))).toEqual({
      from: 0,
      to: 5,
      textFrom: 0,
      textTo: 5
    })
    expect(projection.spansByPath.get(serializePath([1]))).toEqual({
      from: 6,
      to: 16
    })
    expect(projection.spansByPath.get(serializePath([1, 0]))).toEqual({
      from: 6,
      to: 10,
      textFrom: 6,
      textTo: 10
    })
    expect(projection.spansByPath.get(serializePath([1, 1]))).toEqual({
      from: 11,
      to: 16,
      textFrom: 11,
      textTo: 16
    })
    expect(projection.tokPaths).toEqual([[0], [1, 0], [1, 1]])
  })

  test('skips extra spaces around empty leaves', () => {
    const root = makeNode(
      [makeLeaf('alpha', 0), makeLeaf('', 1), makeLeaf('beta', 2)],
      3
    )
    const projection = projectTree(root)

    expect(projection.text).toBe('alphabeta')
    expect(projection.tokPaths).toEqual([[0], [1], [2]])
  })
})
