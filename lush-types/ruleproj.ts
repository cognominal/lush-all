export type MatchValue =
  | { kind: 'literal'; value: string }
  | { kind: 'capture'; name: string }

type MatchSpec = {
  type?: MatchValue
  name?: MatchValue
  data?: MatchValue
  children?: MatchValue
  where?: WherePredicate
}

type WherePredicate =
  | { kind: 'inlineTag'; arg: string }
  | { kind: 'blockTag'; arg: string }

export type EmitExpr =
  | { kind: 'tag'; arg: string }
  | { kind: 'text'; arg: string }
  | { kind: 'inlineTag'; name: string; kids: string }

type EmitSpec =
  | { kind: 'line'; line: EmitExpr }
  | { kind: 'block'; line: EmitExpr; each: string }

export type RuleprojRule = {
  name: string
  match: MatchSpec
  emit: EmitSpec
}

// Parse a match value into a literal or capture.
function parseMatchValue(value: string): MatchValue {
  const trimmed = value.trim()
  if (trimmed.startsWith('$')) {
    return { kind: 'capture', name: trimmed.slice(1) }
  }
  return { kind: 'literal', value: trimmed }
}

// Parse a where clause predicate.
function parseWhereClause(value: string): WherePredicate {
  const trimmed = value.trim()
  const callMatch = /^([a-zA-Z][\w]*)\(([^)]*)\)$/.exec(trimmed)
  if (!callMatch) {
    throw new Error(`Unsupported where clause: ${value}`)
  }
  const name = callMatch[1]
  const arg = callMatch[2].trim()
  if (!arg.startsWith('$')) {
    throw new Error(`Where clause arg must be a capture: ${value}`)
  }
  const capture = arg.slice(1)
  if (name === 'inlineTag') return { kind: 'inlineTag', arg: capture }
  if (name === 'blockTag') return { kind: 'blockTag', arg: capture }
  throw new Error(`Unknown where predicate: ${name}`)
}

// Parse an emit expression for a line directive.
function parseEmitExpr(value: string): EmitExpr {
  const trimmed = value.trim()
  const callMatch = /^([a-zA-Z][\w]*)\(([^)]*)\)$/.exec(trimmed)
  if (!callMatch) {
    throw new Error(`Unsupported emit expression: ${value}`)
  }
  const name = callMatch[1]
  const args = callMatch[2]
    .split(',')
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0)
  // Require that emit args are capture references.
  const capture = (arg: string): string => {
    if (!arg.startsWith('$')) {
      throw new Error(`Emit arg must be a capture: ${value}`)
    }
    return arg.slice(1)
  }
  if (name === 'tag') {
    return { kind: 'tag', arg: capture(args[0] ?? '') }
  }
  if (name === 'text') {
    return { kind: 'text', arg: capture(args[0] ?? '') }
  }
  if (name === 'inlineTag') {
    return {
      kind: 'inlineTag',
      name: capture(args[0] ?? ''),
      kids: capture(args[1] ?? '')
    }
  }
  throw new Error(`Unknown emit function: ${name}`)
}

// Parse a .ruleproj DSL file into rule definitions.
export function parseRuleproj(text: string): RuleprojRule[] {
  const rules: RuleprojRule[] = []
  const lines = text.split(/\r?\n/)
  let currentRule: RuleprojRule | null = null
  let mode: 'match' | 'emit' | null = null
  let pendingBlock = false
  let pendingLine: EmitExpr | null = null
  let pendingEach: string | null = null

  // Finalize the emit spec once we finish a rule.
  const finalizeEmit = () => {
    if (!currentRule || !pendingLine) return
    if (pendingBlock) {
      if (!pendingEach) {
        throw new Error(`Missing each: in block for rule ${currentRule.name}`)
      }
      currentRule.emit = {
        kind: 'block',
        line: pendingLine,
        each: pendingEach
      }
    } else {
      currentRule.emit = { kind: 'line', line: pendingLine }
    }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (trimmed.startsWith('rule ')) {
      finalizeEmit()
      const name = trimmed.slice('rule '.length).trim()
      currentRule = { name, match: {}, emit: { kind: 'line', line: { kind: 'text', arg: '' } } }
      rules.push(currentRule)
      mode = null
      pendingBlock = false
      pendingLine = null
      pendingEach = null
      continue
    }
    if (!currentRule) {
      throw new Error(`Ruleproj entry outside rule: ${trimmed}`)
    }
    if (trimmed === 'match') {
      mode = 'match'
      continue
    }
    if (trimmed === 'emit') {
      mode = 'emit'
      continue
    }
    if (mode === 'match') {
      const [key, ...rest] = trimmed.split(':')
      const value = rest.join(':').trim()
      if (!key || !value) continue
      if (key === 'where') {
        currentRule.match.where = parseWhereClause(value)
      } else if (key === 'type') {
        currentRule.match.type = parseMatchValue(value)
      } else if (key === 'name') {
        currentRule.match.name = parseMatchValue(value)
      } else if (key === 'data') {
        currentRule.match.data = parseMatchValue(value)
      } else if (key === 'children') {
        currentRule.match.children = parseMatchValue(value)
      }
      continue
    }
    if (mode === 'emit') {
      if (trimmed.startsWith('line:')) {
        pendingLine = parseEmitExpr(trimmed.slice('line:'.length))
        continue
      }
      if (trimmed === 'block') {
        pendingBlock = true
        continue
      }
      if (trimmed.startsWith('each:')) {
        const value = trimmed.slice('each:'.length).trim()
        if (!value.startsWith('$')) {
          throw new Error(`each must reference a capture: ${trimmed}`)
        }
        pendingEach = value.slice(1)
        continue
      }
    }
  }

  finalizeEmit()
  return rules
}
