export const SPACE_TYPE = 'Space'
export const NAKED_STRING_TYPE = 'NakedString'

export function tokenText(token) {
  if (!token) return ''
  if (typeof token.text === 'string') return token.text
  if (Array.isArray(token.subTokens)) {
    return token.subTokens.map(tokenText).join('')
  }
  return ''
}

export function tokenizeLine(text) {
  if (!text) return []
  const tokens = []
  let idx = 0
  while (idx < text.length) {
    const start = idx
    const isSpace = text[start] === ' '
    while (idx < text.length && (text[idx] === ' ') === isSpace) idx += 1
    const segment = text.slice(start, idx)
    tokens.push({
      kind: 'YAML',
      type: isSpace ? SPACE_TYPE : NAKED_STRING_TYPE,
      tokenIdx: tokens.length,
      text: segment,
      x: start
    })
  }
  return tokens
}

export function stringToTokenMultiLine(input) {
  if (typeof input !== 'string' || input.length === 0) return []
  return input.split(/\r?\n/).map(tokenizeLine)
}
