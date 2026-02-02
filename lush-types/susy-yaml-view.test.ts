import { describe, expect, test } from 'bun:test'
import {
  findSusyYamlPathAtPos,
  projectSusyYamlView,
  type SusyNode
} from './index'

// Build a small Susy tree for projection tests.
function makeSampleTree(): SusyNode {
  return {
    kind: 'YAML',
    type: 'document',
    tokenIdx: 0,
    kids: [
      {
        kind: 'YAML',
        type: 'scalar',
        tokenIdx: 1,
        text: 'alpha'
      },
      {
        kind: 'YAML',
        type: 'scalar',
        tokenIdx: 2,
        text: 'beta'
      }
    ]
  }
}

describe('projectSusyYamlView', () => {
  test('includes spans for root and children', () => {
    const root = makeSampleTree()
    const projection = projectSusyYamlView(root)
    const rootSpan = projection.spansByPath.get(JSON.stringify([]))
    const childSpan = projection.spansByPath.get(JSON.stringify([0]))
    expect(projection.text.length).toBeGreaterThan(0)
    expect(rootSpan).toBeDefined()
    expect(childSpan).toBeDefined()
  })

  test('finds the most specific path by position', () => {
    const root = makeSampleTree()
    const projection = projectSusyYamlView(root)
    const childSpan = projection.spansByPath.get(JSON.stringify([1]))
    expect(childSpan).toBeDefined()
    const pos = (childSpan?.from ?? 0) + 1
    const path = findSusyYamlPathAtPos(projection.spansByPath, pos)
    expect(path).toEqual([1])
  })
})
