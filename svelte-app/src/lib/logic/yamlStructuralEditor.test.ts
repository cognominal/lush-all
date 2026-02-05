import { describe, expect, test } from 'bun:test'
import { applyYamlCommand } from './yamlStructuralEditor'

const SAMPLE = `root:
  list:
    - one
    - two
  map:
    a: 1
    b: 2
  text: hello
  block: |
    line1
    line2
# comment one
# comment two
`

// Find the first offset of a needle in the sample text.
const offsetAt = (text: string, needle: string): number => {
  const idx = text.indexOf(needle)
  if (idx === -1) throw new Error(`Missing needle: ${needle}`)
  return idx
}

// Apply a command with a selection around an offset.
// Apply a command with a selection around an offset.
const apply = (
  command: Parameters<typeof applyYamlCommand>[0],
  text: string,
  offset: number,
  to?: number
) =>
  applyYamlCommand(command, {
    text,
    selection: { from: offset, to: to ?? offset }
  })

describe('yamlStructuralEditor keybindings', () => {
  test('Tab skips structural tokens like :', () => {
    const offset = offsetAt(SAMPLE, 'a: 1') + 2
    const result = apply('nextField', SAMPLE, offset)
    expect(result).not.toBeNull()
    const expected = offsetAt(SAMPLE, 'a: 1') + 3
    expect(result?.selection.from).toBe(expected)
  })

  test('Tab skips sequence markers like -', () => {
    const offset = offsetAt(SAMPLE, '- one')
    const result = apply('nextField', SAMPLE, offset)
    expect(result).not.toBeNull()
    const expected = offsetAt(SAMPLE, 'one')
    expect(result?.selection.from).toBe(expected)
  })

  test('Enter adds an item in a sequence', () => {
    const offset = offsetAt(SAMPLE, '- one') + 2
    const result = apply('addItem', SAMPLE, offset)
    expect(result).not.toBeNull()
    expect(result?.changes?.insert).toContain('- null')
  })

  test('Enter converts a scalar to a block scalar', () => {
    const offset = offsetAt(SAMPLE, 'text: hello') + 8
    const result = apply('blockScalar', SAMPLE, offset)
    expect(result).not.toBeNull()
    expect(result?.changes?.insert).toContain('|')
  })

  test('Space toggles a collection between block and inline', () => {
    const offset = offsetAt(SAMPLE, 'list:') + 2
    const result = apply('toggleInlineOrBlock', SAMPLE, offset)
    expect(result).not.toBeNull()
    const next = result?.changes?.insert ?? ''
    expect(next.includes('[') || next.includes('{')).toBe(true)
  })

  test('Tab moves to the next field', () => {
    const offset = offsetAt(SAMPLE, 'one')
    const result = apply('nextField', SAMPLE, offset)
    expect(result).not.toBeNull()
    expect(result?.selection.from).not.toBe(offset)
  })

  test('Shift-Tab moves to the previous field', () => {
    const offset = offsetAt(SAMPLE, 'two')
    const result = apply('prevField', SAMPLE, offset)
    expect(result).not.toBeNull()
    expect(result?.selection.from).not.toBe(offset)
  })

  test('Backspace/Delete deletes the selection', () => {
    const start = offsetAt(SAMPLE, 'one')
    const end = start + 3
    const result = apply('deleteSelection', SAMPLE, start, end)
    expect(result).not.toBeNull()
    expect(result?.changes?.insert).toBe('')
  })

  test('Delete replaces a scalar with null when no selection', () => {
    const offset = offsetAt(SAMPLE, 'one')
    const result = apply('deleteSelection', SAMPLE, offset)
    expect(result).not.toBeNull()
    expect(result?.changes?.insert).toBe('null')
  })

  test('Escape enlarges the selection to the parent node', () => {
    const offset = offsetAt(SAMPLE, 'one')
    const result = apply('enlargeSelection', SAMPLE, offset)
    expect(result).not.toBeNull()
    const slice = SAMPLE.slice(result?.selection.from ?? 0, result?.selection.to ?? 0)
    expect(slice).toContain('- one')
  })

  test('[ moves to the previous comment', () => {
    const offset = offsetAt(SAMPLE, 'comment two')
    const result = apply('prevComment', SAMPLE, offset)
    expect(result).not.toBeNull()
    const selection = result?.selection.from ?? 0
    expect(SAMPLE.slice(selection)).toContain('#')
  })

  test('] moves to the next comment', () => {
    const offset = offsetAt(SAMPLE, 'block:')
    const result = apply('nextComment', SAMPLE, offset)
    expect(result).not.toBeNull()
    const selection = result?.selection.from ?? 0
    expect(SAMPLE.slice(selection)).toContain('#')
  })
})
