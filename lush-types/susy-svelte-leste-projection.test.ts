import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { projectTree } from '../svelte-codemirror/src/projection'
import { susySvelteLesteProjection, type SusyNode } from './index'
import { NAKED_STRING_TYPE, SPACE_TYPE } from './token-lists'

// Collect token types in a Susy tree.
function collectTypes(node: SusyNode, types: string[] = []): string[] {
  types.push(node.type)
  if (Array.isArray(node.kids)) {
    for (const child of node.kids) collectTypes(child, types)
  }
  return types
}

describe('susySvelteLesteProjection', () => {
  test('projects simple svelte into leste text', () => {
    const ruleproj = readFileSync(
      new URL('./projections/svelte-leste.ruleproj', import.meta.url),
      'utf8'
    )
    const source = '<h1>&lt;<b>bold</b>sample text</h1>'
    const root = susySvelteLesteProjection(source, ruleproj)
    const projection = projectTree(root)
    expect(projection.text).toBe('h1\n  <bbold/bsample text')
  })

  test('uses NakedString for text, Space for whitespace, and tag for tags', () => {
    const ruleproj = readFileSync(
      new URL('./projections/svelte-leste.ruleproj', import.meta.url),
      'utf8'
    )
    const source = '<h1>&lt;<b>bold</b>sample text</h1>'
    const root = susySvelteLesteProjection(source, ruleproj)
    const types = new Set(collectTypes(root))
    const allowed = new Set([NAKED_STRING_TYPE, SPACE_TYPE, 'tag', 'Root'])
    for (const type of types) {
      expect(allowed.has(type)).toBe(true)
    }
  })

  test('projects attributes into leste tag modifiers', () => {
    const ruleproj = readFileSync(
      new URL('./projections/svelte-leste.ruleproj', import.meta.url),
      'utf8'
    )
    const source = '<h1 id="the-id" class="class1 class2" data-foo="foo">Hello</h1>'
    const root = susySvelteLesteProjection(source, ruleproj)
    const projection = projectTree(root)
    expect(projection.text).toBe('h1#the-id .class1 .class2 data-foo=foo Hello')
  })
})
