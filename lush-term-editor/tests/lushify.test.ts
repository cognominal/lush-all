import { describe, expect, test } from 'bun:test'
import type { SusyLines } from 'lush-types'
import { lushify } from 'yaml'

describe('YAML.lushify integration', () => {
  test('maps list with nested map into SusyLines', () => {
    const yamlSrc = `- toto
- a: b
  c: d
`
    const tokens = lushify(yamlSrc) as SusyLines
    expect(tokens).toBeDefined()
    expect(tokens).toHaveLength(4)

    expect(tokens[0]?.map(t => t.text).join('')).toBe('- toto')
    expect(tokens[0]?.map(t => t.type)).toEqual([
      'seq-item-ind',
      'space',
      'scalar'
    ])

    expect(tokens[1]?.map(t => t.text).join('')).toBe('- a: b')
    expect(tokens[1]?.map(t => t.type)).toEqual([
      'seq-item-ind',
      'space',
      'scalar',
      'map-value-ind',
      'space',
      'scalar'
    ])

    expect(tokens[2]?.map(t => t.text).join('')).toBe('  c: d')
    expect(tokens[2]?.map(t => t.type)).toEqual([
      'space',
      'scalar',
      'map-value-ind',
      'space',
      'scalar'
    ])

    expect(tokens[3]).toEqual([])
  })
})
