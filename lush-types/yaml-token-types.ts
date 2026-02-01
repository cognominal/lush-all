import { YAML_TOKEN_TYPES } from './token-lists'
import { registerTokenType } from './token-registry'

// Register YAML token types using the YAML.* prefix.
export function registerYamlTokenTypes(): void {
  for (const tokenType of YAML_TOKEN_TYPES) {
    registerTokenType(`YAML.${tokenType}`)
  }
}

registerYamlTokenTypes()
