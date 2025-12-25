import { Composer } from './compose/composer.ts'
import type { Reviver } from './doc/applyReviver.ts'
import type { Replacer } from './doc/Document.ts'
import { Document } from './doc/Document.ts'
import { prettifyError, YAMLParseError } from './errors.ts'
import { warn } from './log.ts'
import { isDocument } from './nodes/identity.ts'
import type { Node, ParsedNode } from './nodes/Node.ts'
import type {
  CreateNodeOptions,
  DocumentOptions,
  ParseOptions,
  SchemaOptions,
  ToJSOptions,
  ToStringOptions
} from './options.ts'
import type * as CST from './parse/cst.ts'
import { LineCounter } from './parse/line-counter.ts'
import { Parser } from './parse/parser.ts'
import type { SusyNode, SusyLines } from 'lush-types'

export interface EmptyStream
  extends Array<Document.Parsed>,
    ReturnType<Composer['streamInfo']> {
  empty: true
}

function parseOptions(options: ParseOptions) {
  const prettyErrors = options.prettyErrors !== false
  const lineCounter =
    options.lineCounter || (prettyErrors && new LineCounter()) || null
  return { lineCounter, prettyErrors }
}

/**
 * Parse the input as a stream of YAML documents.
 *
 * Documents should be separated from each other by `...` or `---` marker lines.
 *
 * @returns If an empty `docs` array is returned, it will be of type
 *   EmptyStream and contain additional stream information. In
 *   TypeScript, you should use `'empty' in docs` as a type guard for it.
 */
export function parseAllDocuments<
  Contents extends Node = ParsedNode,
  Strict extends boolean = true
>(
  source: string,
  options: ParseOptions & DocumentOptions & SchemaOptions = {}
):
  | Array<
      Contents extends ParsedNode
        ? Document.Parsed<Contents, Strict>
        : Document<Contents, Strict>
    >
  | EmptyStream {
  const { lineCounter, prettyErrors } = parseOptions(options)
  const parser = new Parser(lineCounter?.addNewLine)
  const composer = new Composer(options)
  const docs = Array.from(composer.compose(parser.parse(source)))

  if (prettyErrors && lineCounter)
    for (const doc of docs) {
      doc.errors.forEach(prettifyError(source, lineCounter))
      doc.warnings.forEach(prettifyError(source, lineCounter))
    }

  type DocType = Contents extends ParsedNode
    ? Document.Parsed<Contents, Strict>
    : Document<Contents, Strict>
  if (docs.length > 0) return docs as DocType[]
  return Object.assign<
    DocType[],
    { empty: true },
    ReturnType<Composer['streamInfo']>
  >([], { empty: true }, composer.streamInfo())
}

/** Parse an input string into a single YAML.Document */
export function parseDocument<
  Contents extends Node = ParsedNode,
  Strict extends boolean = true
>(
  source: string,
  options: ParseOptions & DocumentOptions & SchemaOptions = {}
): Contents extends ParsedNode
  ? Document.Parsed<Contents, Strict>
  : Document<Contents, Strict> {
  const { lineCounter, prettyErrors } = parseOptions(options)
  const parser = new Parser(lineCounter?.addNewLine)
  const composer = new Composer(options)

  type DocType = Contents extends ParsedNode
    ? Document.Parsed<Contents, Strict>
    : Document<Contents, Strict>
  // `doc` is always set by compose.end(true) at the very latest
  let doc: DocType = null as any
  for (const _doc of composer.compose(
    parser.parse(source),
    true,
    source.length
  )) {
    if (!doc) doc = _doc as DocType
    else if (doc.options.logLevel !== 'silent') {
      doc.errors.push(
        new YAMLParseError(
          _doc.range.slice(0, 2) as [number, number],
          'MULTIPLE_DOCS',
          'Source contains multiple documents; please use YAML.parseAllDocuments()'
        )
      )
      break
    }
  }

  if (prettyErrors && lineCounter) {
    doc.errors.forEach(prettifyError(source, lineCounter))
    doc.warnings.forEach(prettifyError(source, lineCounter))
  }
  return doc
}

/**
 * Parse an input string into JavaScript.
 *
 * Only supports input consisting of a single YAML document; for multi-document
 * support you should use `YAML.parseAllDocuments`. May throw on error, and may
 * log warnings using `console.warn`.
 *
 * @param str - A string with YAML formatting.
 * @param reviver - A reviver function, as in `JSON.parse()`
 * @returns The value will match the type of the root value of the parsed YAML
 *   document, so Maps become objects, Sequences arrays, and scalars result in
 *   nulls, booleans, numbers and strings.
 */
export function parse(
  src: string,
  options?: ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions
): any
export function parse(
  src: string,
  reviver: Reviver,
  options?: ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions
): any

export function parse(
  src: string,
  reviver?:
    | Reviver
    | (ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions),
  options?: ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions
): any {
  let _reviver: Reviver | undefined = undefined
  if (typeof reviver === 'function') {
    _reviver = reviver
  } else if (options === undefined && reviver && typeof reviver === 'object') {
    options = reviver
  }

  const doc = parseDocument(src, options)
  if (!doc) return null
  doc.warnings.forEach(warning => warn(doc.options.logLevel, warning))
  if (doc.errors.length > 0) {
    if (doc.options.logLevel !== 'silent') throw doc.errors[0]
    else doc.errors = []
  }
  return doc.toJS(Object.assign({ reviver: _reviver }, options))
}

/**
 * Stringify a value as a YAML document.
 *
 * @param replacer - A replacer array or function, as in `JSON.stringify()`
 * @returns Will always include `\n` as the last character, as is expected of YAML documents.
 */
export function stringify(
  value: any,
  options?: DocumentOptions &
    SchemaOptions &
    ParseOptions &
    CreateNodeOptions &
    ToStringOptions
): string
export function stringify(
  value: any,
  replacer?: Replacer | null,
  options?:
    | string
    | number
    | (DocumentOptions &
        SchemaOptions &
        ParseOptions &
        CreateNodeOptions &
        ToStringOptions)
): string

export function stringify(
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
    | string
    | number
    | (DocumentOptions &
        SchemaOptions &
        ParseOptions &
        CreateNodeOptions &
        ToStringOptions)
) {
  let _replacer: Replacer | null = null
  if (typeof replacer === 'function' || Array.isArray(replacer)) {
    _replacer = replacer
  } else if (options === undefined && replacer) {
    options = replacer
  }

  if (typeof options === 'string') options = options.length
  if (typeof options === 'number') {
    const indent = Math.round(options)
    options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent }
  }
  if (value === undefined) {
    const { keepUndefined } = options ?? (replacer as CreateNodeOptions) ?? {}
    if (!keepUndefined) return undefined
  }
  if (isDocument(value) && !_replacer) return value.toString(options)
  return new Document(value, _replacer, options).toString(options)
}

type FlatToken = { type: SusyNode['type']; source: string }

function pushSourceTokens(
  list: CST.SourceToken[] | undefined,
  out: FlatToken[]
) {
  if (!list) return
  for (const tok of list) out.push({ type: tok.type, source: tok.source })
}

function flattenItem(item: CST.CollectionItem, out: FlatToken[]) {
  pushSourceTokens(item.start, out)
  if (item.key) flattenCst(item.key, out)
  pushSourceTokens(item.sep, out)
  if (item.value) flattenCst(item.value, out)
}

function flattenCst(token: CST.Token, out: FlatToken[]): void {
  switch (token.type) {
    case 'block-scalar':
      for (const prop of token.props) flattenCst(prop, out)
      out.push({ type: token.type, source: token.source })
      break
    case 'block-map':
      for (const it of token.items) flattenItem(it, out)
      break
    case 'block-seq':
      for (const it of token.items) flattenItem(it, out)
      break
    case 'flow-collection':
      out.push({ type: token.start.type, source: token.start.source })
      for (const it of token.items) flattenItem(it, out)
      for (const st of token.end)
        out.push({ type: st.type, source: st.source })
      break
    case 'document':
      pushSourceTokens(token.start, out)
      if (token.value) flattenCst(token.value, out)
      pushSourceTokens(token.end, out)
      break
    case 'doc-end':
      out.push({ type: token.type, source: token.source })
      pushSourceTokens(token.end, out)
      break
    default:
      out.push({ type: token.type, source: (token as any).source })
      if ('end' in token && token.end) pushSourceTokens(token.end, out)
  }
}

function flatToMultiLine(flat: FlatToken[]): SusyLines {
  const lines: SusyLines = [[]]
  let line = 0
  let x = 0

  for (const { type, source } of flat) {
    if (!source) continue
    const parts = source.split(/\n/)
    for (let i = 0; i < parts.length; ++i) {
      const part = parts[i]
      if (part) {
        const tokens = lines[line] ?? (lines[line] = [])
        tokens.push({
          kind: 'YAML',
          type,
          tokenIdx: tokens.length,
          text: part,
          x
        })
        x += part.length
      }
      if (i < parts.length - 1) {
        line += 1
        lines[line] = []
        x = 0
      }
    }
  }

  return lines
}

export function lushify(
  value: any,
  options?:
    | (DocumentOptions &
        SchemaOptions &
        ParseOptions &
        CreateNodeOptions &
        ToStringOptions)
    | string
    | number
): SusyLines | undefined
export function lushify(
  value: any,
  replacer?: Replacer | null,
  options?:
    | (DocumentOptions &
        SchemaOptions &
        ParseOptions &
        CreateNodeOptions &
        ToStringOptions)
    | string
    | number
): SusyLines | undefined

export function lushify(
  value: any,
  replacer?:
    | Replacer
    | null
    | (DocumentOptions &
        SchemaOptions &
        ParseOptions &
        CreateNodeOptions &
        ToStringOptions)
    | string
    | number,
  options?:
    | (DocumentOptions &
        SchemaOptions &
        ParseOptions &
        CreateNodeOptions &
        ToStringOptions)
    | string
    | number
): SusyLines | undefined {
  const hasReplacer =
    typeof replacer === 'function' || Array.isArray(replacer) || replacer === null

  const _replacer = hasReplacer ? (replacer as Replacer | null) : null
  const _options = hasReplacer ? options : (replacer as typeof options)

  // Accept pre-stringified YAML input directly; otherwise stringify the JS value.
  const yaml =
    typeof value === 'string'
      ? (value as string)
      : stringify(value, _replacer, _options)
  if (yaml === undefined) return undefined
  const parser = new Parser()
  const flat: FlatToken[] = []
  for (const tok of parser.parse(yaml)) flattenCst(tok, flat)
  return flatToMultiLine(flat)
}
