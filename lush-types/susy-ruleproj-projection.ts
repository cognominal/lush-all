import { NAKED_STRING_TYPE, SPACE_TYPE } from './token-lists'
import type { LushTokenKind, SusyNode, TokenTypeName } from './index'

type RawToken = {
  kind: LushTokenKind
  type: TokenTypeName
  text: string
  x?: number
}

const RULEPROJ_KIND = 'Lush' as LushTokenKind

// Split ruleproj text into whitespace and non-whitespace tokens.
function tokenizeRuleproj(text: string): RawToken[] {
  const parts = text.split(/(\s+)/)
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      const isSpace = /^\s+$/.test(part)
      return {
        kind: RULEPROJ_KIND,
        type: isSpace ? SPACE_TYPE : NAKED_STRING_TYPE,
        text: part
      }
    })
}

// Assign token indices sequentially across a Susy tree.
function assignTokenIdx(node: SusyNode, idxRef: { value: number }): void {
  node.tokenIdx = idxRef.value++
  if (node.kids) node.kids.forEach((kid) => assignTokenIdx(kid, idxRef))
}

// Project ruleproj source into a Susy tree with naked strings and spaces.
export function susyRuleprojProjection(source: string): SusyNode {
  const tokens = tokenizeRuleproj(source)
  let offset = 0
  const kids: SusyNode[] = tokens.map((token) => {
    const node: SusyNode = {
      kind: token.kind,
      type: token.type,
      tokenIdx: 0,
      text: token.text,
      x: offset
    }
    offset += token.text.length
    return node
  })
  const root: SusyNode = {
    kind: RULEPROJ_KIND,
    type: 'Root' as TokenTypeName,
    tokenIdx: 0,
    text: source,
    x: 0,
    kids
  }
  assignTokenIdx(root, { value: 0 })
  return root
}
