import { describe, expect, test } from 'bun:test'
import { createHighlightRegistry } from './highlight'

describe('createHighlightRegistry', () => {
  test('does not let empty exact rules block wildcard rules', () => {
    const registry = createHighlightRegistry(
      new Map([
        ['.keyword', 'blue'],
        ['ts.keyword', '']
      ])
    )
    expect(registry.classFor('ts', 'keyword')).not.toBeNull()
  })

  test('returns no class when only empty rules exist', () => {
    const registry = createHighlightRegistry(
      new Map([
        ['ts.keyword', '']
      ])
    )
    expect(registry.classFor('ts', 'keyword')).toBeNull()
  })
})
