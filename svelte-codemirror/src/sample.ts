import type { InputToken, TokenTypeName } from '../../lush-types/index.ts'

let tokenIdxCounter = 0

function makeToken(text: string, type: TokenTypeName): InputToken {
  const token: InputToken = {
    kind: 'js',
    type,
    tokenIdx: tokenIdxCounter,
    text
  }
  tokenIdxCounter += 1
  return token
}

function makeLine(tokens: InputToken[]): InputToken {
  return {
    kind: 'js',
    type: 'block-seq',
    tokenIdx: tokenIdxCounter++,
    subTokens: [...tokens, makeToken('\n', 'punctuation')]
  }
}

export function createSampleJsTree(): InputToken {
  tokenIdxCounter = 0

  const line1 = makeLine([
    makeToken('const', 'keyword'),
    makeToken('total', 'variable'),
    makeToken('=', 'operator'),
    makeToken('42', 'number'),
    makeToken(';', 'punctuation')
  ])

  const line2 = makeLine([
    makeToken('function', 'keyword'),
    makeToken('add', 'variable'),
    makeToken('(', 'punctuation'),
    makeToken('a', 'variable'),
    makeToken(',', 'punctuation'),
    makeToken('b', 'variable'),
    makeToken(')', 'punctuation'),
    makeToken('{', 'punctuation')
  ])

  const line3 = makeLine([
    makeToken('return', 'keyword'),
    makeToken('a', 'variable'),
    makeToken('+', 'operator'),
    makeToken('b', 'variable'),
    makeToken(';', 'punctuation')
  ])

  const line4 = makeLine([makeToken('}', 'punctuation')])

  const line5 = makeLine([
    makeToken('console', 'variable'),
    makeToken('.', 'punctuation'),
    makeToken('log', 'variable'),
    makeToken('(', 'punctuation'),
    makeToken('add', 'variable'),
    makeToken('(', 'punctuation'),
    makeToken('total', 'variable'),
    makeToken(',', 'punctuation'),
    makeToken('8', 'number'),
    makeToken(')', 'punctuation'),
    makeToken(')', 'punctuation'),
    makeToken(';', 'punctuation')
  ])

  return {
    kind: 'js',
    type: 'document',
    tokenIdx: tokenIdxCounter++,
    subTokens: [line1, line2, line3, line4, line5]
  }
}
