import { describe, expect, test } from 'bun:test'
import { sveltePick, yaml_weedout } from './utils'

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
