import { describe, expect, test } from 'bun:test'
import { lookupPatternValue, sveltePick, yaml_weedout } from './utils'

type AttributeLike = {
  name?: unknown
}

function attributeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const names: string[] = []
  for (const entry of value) {
    if (entry && typeof entry === 'object' && 'name' in entry) {
      const name = (entry as AttributeLike).name
      if (typeof name === 'string') {
        names.push(name)
      }
    }
  }
  return names
}

describe('sveltePick', () => {
  test('returns class attributes', () => {
    const result = sveltePick(
      '<h1 class="a b">foo</h1>',
      'ast.html.children.0.attributes'
    )
    expect(attributeNames(result)).toEqual(['class'])
  })

  test('returns custom attributes', () => {
    const result = sveltePick(
      '<h1 foo="bar">text</h1>',
      'ast.html.children.0.attributes'
    )
    expect(attributeNames(result)).toEqual(['foo'])
  })

  test('returns id attributes', () => {
    const result = sveltePick(
      '<h1 id="an_id">text</h1>',
      'ast.html.children.0.attributes'
    )
    expect(attributeNames(result)).toEqual(['id'])
  })

  test('can return yaml when requested', () => {
    const result = sveltePick(
      '<h1 id="an_id">text</h1>',
      'ast.html.children.0.attributes',
      true
    )
    expect(typeof result).toBe('string')
    expect(result).toContain('id')
  })

  test('returns yaml for the full h1 node', () => {
    const result = sveltePick(
      '<h1 id="an_id">text</h1>',
      'ast.html.children.0',
      true
    )
    expect(result).toBe(
      [
        'type: Element',
        'start: 0',
        'end: 24',
        'name: h1',
        'attributes:',
        '  - type: Attribute',
        '    start: 4',
        '    end: 14',
        '    name: id',
        '    name_loc:',
        '      start:',
        '        line: 1',
        '        column: 4',
        '        character: 4',
        '      end:',
        '        line: 1',
        '        column: 6',
        '        character: 6',
        '    value:',
        '      - start: 8',
        '        end: 13',
        '        type: Text',
        '        raw: an_id',
        '        data: an_id',
        'children:',
        '  - type: Text',
        '    start: 15',
        '    end: 19',
        '    raw: text',
        '    data: text',
        ''
      ].join('\n')
    )
  })

  test('strips keys from yaml output', () => {
    const result = sveltePick(
      '<h1 id="an_id">text</h1>',
      'ast.html.children.0',
      true
    )
    const stripped = yaml_weedout(result, ['name_loc', 'start', 'end'])
    expect(stripped).toBe(
      [
        'type: Element',
        'name: h1',
        'attributes:',
        '  - type: Attribute',
        '    name: id',
        '    value:',
        '      - type: Text',
        '        raw: an_id',
        '        data: an_id',
        'children:',
        '  - type: Text',
        '    raw: text',
        '    data: text',
        ''
      ].join('\n')
    )
  })

  test('accepts space-separated key strings', () => {
    const result = sveltePick(
      '<h1 id="an_id">text</h1>',
      'ast.html.children.0',
      true
    )
    const stripped = yaml_weedout(result, 'name_loc start end')
    expect(stripped).toBe(
      [
        'type: Element',
        'name: h1',
        'attributes:',
        '  - type: Attribute',
        '    name: id',
        '    value:',
        '      - type: Text',
        '        raw: an_id',
        '        data: an_id',
        'children:',
        '  - type: Text',
        '    raw: text',
        '    data: text',
        ''
      ].join('\n')
    )
  })
})

// Covers wildcard lookup precedence and quoting.
describe('lookupPatternValue', () => {
  // Ensures exact keys win over wildcard candidates.
  test('prefers exact keys over wildcards', () => {
    const source = {
      'foo.bar': 'exact',
      '*.bar': 'suffix-wildcard',
      'foo.*': 'prefix-wildcard',
      '*': 'fallback'
    }
    expect(lookupPatternValue(source, 'foo.bar')).toBe('exact')
  })

  // Verifies the fallback order when the exact key is missing.
  test('falls back to wildcard suffix, then prefix, then *', () => {
    const source = {
      '*.bar': 'suffix-wildcard',
      'foo.*': 'prefix-wildcard',
      '*': 'fallback'
    }
    expect(lookupPatternValue(source, 'foo.bar')).toBe('suffix-wildcard')
  })

  // Confirms foo.* is selected when the suffix wildcard is absent.
  test('uses foo.* when *.bar is missing', () => {
    const source = {
      'foo.*': 'prefix-wildcard',
      '*': 'fallback'
    }
    expect(lookupPatternValue(source, 'foo.bar')).toBe('prefix-wildcard')
  })

  // Confirms * is the final fallback.
  test('uses * as the ultimate fallback', () => {
    const source = {
      '*': 'fallback'
    }
    expect(lookupPatternValue(source, 'foo.bar')).toBe('fallback')
  })

  // Ensures quoted segments with dots are preserved in lookups.
  test('supports quoted segments with dots in the key', () => {
    const source = new Map<string, string>([
      ["*.'bar.baz'", 'suffix-wildcard'],
      ['*', 'fallback']
    ])
    expect(lookupPatternValue(source, "foo.'bar.baz'")).toBe('suffix-wildcard')
  })
})
