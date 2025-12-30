import { describe, expect, test } from 'bun:test'
import {
  createInitialState,
  handleReturn,
  lineToText,
  sampleMultiLines
} from '../src/yamlStructuralEditor'

const linesToStrings = (lines: typeof sampleMultiLines) => lines.map(lineToText)

describe('yamlStructuralEditor', () => {
  test('initializes sample multilines from sample YAML', () => {
    const state = createInitialState()
    const asText = linesToStrings(state.lines)
    expect(asText.length).toBeGreaterThan(0)
    expect(asText[0]).toContain('- ')
  })

  test('splices an empty array item after the active line on return', () => {
    const state = createInitialState()
    const initialAsText = linesToStrings(state.lines)
    const updated = handleReturn({ ...state, cursor: { lineIdx: 1, colIdx: 0 } })
    const updatedAsText = linesToStrings(updated.lines)

    expect(updatedAsText.length).toBe(initialAsText.length + 1)
    expect(updatedAsText[2].trim()).toBe('-')
    expect(updated.cursor.lineIdx).toBe(2)
    expect(updated.cursor.colIdx).toBe(updatedAsText[2].length)
  })

  test('builds a jsView multiline from parsed YAML', () => {
    const state = createInitialState()
    const jsViewLines = linesToStrings(state.jsView)
    expect(jsViewLines.join('\n')).toContain('toto')
  })
})
