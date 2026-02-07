import { NAKED_STRING_TYPE, SPACE_TYPE } from './token-lists'
import { registerTokenType } from './token-registry'

declare module './token-registry' {
  interface TokenKindMap {
    leste: true
  }
}

// Register Leste token types using the leste.* prefix.
export function registerLesteTokenTypes(): void {
  registerTokenType(`leste.${NAKED_STRING_TYPE}`)
  registerTokenType(`leste.${SPACE_TYPE}`)
  registerTokenType('leste.tag')
}

registerLesteTokenTypes()
