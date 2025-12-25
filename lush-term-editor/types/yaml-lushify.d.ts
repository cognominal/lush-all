import type { SusyLines } from 'lush-types'
import type {
  CreateNodeOptions,
  DocumentOptions,
  ParseOptions,
  SchemaOptions,
  ToStringOptions
} from 'yaml'
import type { Replacer } from 'yaml/dist/doc/Document'

declare module 'yaml' {
  /**
   * Convert a YAML string or value into multi-line lush tokens.
   */
  export function lushify(
    value: any,
    replacer?:
      | Replacer
      | (DocumentOptions &
          SchemaOptions &
          ParseOptions &
          CreateNodeOptions &
          ToStringOptions)
      | null,
    options?:
      | (DocumentOptions &
          SchemaOptions &
          ParseOptions &
          CreateNodeOptions &
          ToStringOptions)
      | string
      | number
  ): SusyLines | undefined
}
