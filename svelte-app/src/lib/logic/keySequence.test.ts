import { describe, expect, test } from 'bun:test'
import { createPrefixKeyHandler } from './keySequence'

describe('createPrefixKeyHandler', () => {
  test('stores and consumes a prefix', () => {
    const handler = createPrefixKeyHandler<'a' | 'b'>(50)
    handler.setPrefix('a')
    const consumed = handler.consume('a', () => true)
    expect(consumed).toBe(true)
    expect(handler.getPrefix()).toBeNull()
  })

  test('ignores mismatched prefix', () => {
    const handler = createPrefixKeyHandler<'a' | 'b'>(50)
    handler.setPrefix('a')
    const consumed = handler.consume('b', () => true)
    expect(consumed).toBe(false)
    expect(handler.getPrefix()).toBe('a')
  })

  test('clears prefix on demand', () => {
    const handler = createPrefixKeyHandler<'a' | 'b'>(50)
    handler.setPrefix('b')
    handler.clear()
    expect(handler.getPrefix()).toBeNull()
  })
})
