import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve, relative, sep } from 'node:path'
import { error } from '@sveltejs/kit'
import { marked } from 'marked'
import type { PageServerLoad } from './$types'
import type { FileNode } from '$lib/docs/types'

const ROOT = resolve(process.cwd(), '..')
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.svelte-kit', 'build'])

function toPosixPath(value: string): string {
  return value.split(sep).join('/')
}

function isWithinRoot(value: string): boolean {
  const rootPrefix = ROOT.endsWith(sep) ? ROOT : `${ROOT}${sep}`
  return value === ROOT || value.startsWith(rootPrefix)
}

const EXTERNAL_PROTOCOL = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])
const HIGHLIGHT_OPEN = '[[H]]'
const HIGHLIGHT_CLOSE = '[[/H]]'

type ResolvedLink = {
  href: string
  isExternal: boolean
  isDocLink: boolean
  docPath?: string
}

function resolveDocHref(href: string, basePath: string | null): ResolvedLink {
  if (href.startsWith('#')) {
    return { href, isExternal: false, isDocLink: false }
  }

  if (EXTERNAL_PROTOCOL.test(href)) {
    try {
      const url = new URL(href)
      if (LOCAL_HOSTS.has(url.hostname) && url.pathname.endsWith('.md')) {
        const normalized = url.pathname.replace(/^\/+/, '')
        const hash = url.hash ?? ''
        return resolveDocHref(`${normalized}${hash}`, basePath)
      }
    } catch {
      // Fall through to treat malformed URLs as external.
    }
    return { href, isExternal: true, isDocLink: false }
  }

  const hashIndex = href.indexOf('#')
  const rawPath = hashIndex === -1 ? href : href.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex)

  if (!rawPath || !rawPath.endsWith('.md')) {
    return { href, isExternal: false, isDocLink: false }
  }

  const normalized = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath
  const absTarget = rawPath.startsWith('/')
    ? resolve(ROOT, normalized)
    : basePath
      ? resolve(dirname(resolve(ROOT, basePath)), normalized)
      : resolve(ROOT, normalized)

  if (!isWithinRoot(absTarget)) {
    return { href, isExternal: false, isDocLink: false }
  }

  const relTarget = toPosixPath(relative(ROOT, absTarget))
  const encoded = encodeURIComponent(relTarget)
  return {
    href: `/docs?path=${encoded}${hash}`,
    isExternal: false,
    isDocLink: true,
    docPath: relTarget
  }
}

function buildRenderer(basePath: string | null) {
  const renderer = new marked.Renderer()

  const applyHighlight = (value: string) =>
    value
      .split(HIGHLIGHT_OPEN)
      .join('<span class="text-rose-400">')
      .split(HIGHLIGHT_CLOSE)
      .join('</span>')

  renderer.heading = function (token) {
    const base = 'font-semibold text-slate-50'
    const sizes: Record<number, string> = {
      1: 'text-3xl tracking-tight mt-6',
      2: 'text-2xl tracking-tight mt-6',
      3: 'text-xl mt-5',
      4: 'text-lg mt-4',
      5: 'text-base mt-4 uppercase tracking-wide',
      6: 'text-sm mt-4 uppercase tracking-wide'
    }
    const size = sizes[token.depth] ?? sizes[3]
    const text = this.parser.parseInline(token.tokens)
    return `<h${token.depth} class="${base} ${size}">${text}</h${token.depth}>`
  }

  renderer.paragraph = function (token) {
    const text = this.parser.parseInline(token.tokens)
    return `<p class="mt-3 text-sm leading-6 text-slate-200">${text}</p>`
  }

  renderer.list = function (token) {
    const listClass = token.ordered
      ? 'mt-3 list-decimal space-y-1 pl-6 text-sm text-slate-200'
      : 'mt-3 list-disc space-y-1 pl-6 text-sm text-slate-200'
    const tag = token.ordered ? 'ol' : 'ul'
    const body = token.items.map((item) => this.listitem(item)).join('')
    return `<${tag} class="${listClass}">${body}</${tag}>`
  }

  renderer.listitem = function (token) {
    const text = this.parser.parse(token.tokens)
    return `<li class="leading-6">${text}</li>`
  }

  renderer.codespan = (token) =>
    `<code class="rounded bg-slate-800/70 px-1 py-0.5 text-xs text-amber-200">${applyHighlight(
      token.text
    )}</code>`

  renderer.code = function (token) {
    const language = token.lang ? `language-${token.lang}` : 'language-text'
    return `<pre class="mt-4 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200"><code class="${language}">${applyHighlight(
      token.text
    )}</code></pre>`
  }

  renderer.blockquote = function (token) {
    const text = this.parser.parse(token.tokens)
    return `<blockquote class="mt-4 border-l-2 border-slate-700 pl-4 text-sm text-slate-300">${text}</blockquote>`
  }

  renderer.link = function (token) {
    const label = this.parser.parseInline(token.tokens) || token.href
    const titleAttr = token.title ? ` title="${token.title}"` : ''
    const resolved = resolveDocHref(token.href, basePath)
    const externalAttrs = resolved.isExternal ? ' target="_blank" rel="noreferrer"' : ''
    const docAttrs = resolved.isDocLink
      ? ` data-doc-path="${resolved.docPath}" data-source-href="${token.href}"`
      : ''
    return `<a class="text-sky-300 underline decoration-sky-400/40 underline-offset-4 hover:text-sky-200" href="${resolved.href}"${titleAttr}${docAttrs}${externalAttrs}>${label}</a>`
  }

  renderer.hr = () => '<hr class="my-6 border-slate-800" />'

  return renderer
}

function hasFile(tree: FileNode[], target: string): boolean {
  for (const node of tree) {
    if (node.type === 'file') {
      if (node.path === target) return true
    } else if (node.children && hasFile(node.children, target)) {
      return true
    }
  }
  return false
}

type SearchScope = 'files' | 'docs'
type SearchMode = 'text' | 'regex'

type SearchState = {
  query: string
  scope: SearchScope
  mode: SearchMode
  caseSensitive: boolean
  dailyOnly: boolean
  count: number
  error?: string
}

type LineMatch = { line: number; start: number; end: number }

type MatchGroup = {
  startLine: number
  endLine: number
  firstMatchLine: number
  lastMatchLine: number
}

type FileMatches = {
  path: string
  lines: string[]
  groups: MatchGroup[]
  matchesByLine: Map<number, LineMatch[]>
}

function buildRegexMatcher(query: string, caseSensitive: boolean): RegExp {
  return new RegExp(query, caseSensitive ? 'g' : 'gi')
}

function findLineMatches(
  lines: string[],
  query: string,
  mode: SearchMode,
  caseSensitive: boolean
): Map<number, LineMatch[]> {
  const matches = new Map<number, LineMatch[]>()
  if (!query) return matches

  if (mode === 'regex') {
    const regex = buildRegexMatcher(query, caseSensitive)
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex]
      regex.lastIndex = 0
      let match = regex.exec(line)
      while (match) {
        const value = match[0]
        if (!value) break
        const start = match.index
        const end = start + value.length
        const lineMatches = matches.get(lineIndex) ?? []
        lineMatches.push({ line: lineIndex, start, end })
        matches.set(lineIndex, lineMatches)
        match = regex.exec(line)
      }
    }
    return matches
  }

  const needle = caseSensitive ? query : query.toLowerCase()
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    const haystack = caseSensitive ? line : line.toLowerCase()
    let fromIndex = 0
    while (fromIndex < haystack.length) {
      const found = haystack.indexOf(needle, fromIndex)
      if (found === -1) break
      const end = found + needle.length
      const lineMatches = matches.get(lineIndex) ?? []
      lineMatches.push({ line: lineIndex, start: found, end })
      matches.set(lineIndex, lineMatches)
      fromIndex = end
    }
  }
  return matches
}

function groupMatches(
  matchesByLine: Map<number, LineMatch[]>,
  totalLines: number
): MatchGroup[] {
  const matchLines = Array.from(matchesByLine.keys()).sort((a, b) => a - b)
  if (matchLines.length === 0) return []

  const groups: MatchGroup[] = []
  let current: MatchGroup | null = null

  for (const line of matchLines) {
    const windowStart = Math.max(0, line - 3)
    const windowEnd = Math.min(totalLines - 1, line + 3)

    if (!current) {
      current = {
        startLine: windowStart,
        endLine: windowEnd,
        firstMatchLine: line,
        lastMatchLine: line
      }
      continue
    }

    if (line - current.lastMatchLine <= 6) {
      current.endLine = Math.max(current.endLine, windowEnd)
      current.lastMatchLine = line
    } else {
      groups.push(current)
      current = {
        startLine: windowStart,
        endLine: windowEnd,
        firstMatchLine: line,
        lastMatchLine: line
      }
    }
  }

  if (current) groups.push(current)
  return groups
}

function highlightLine(
  line: string,
  matches: LineMatch[] | undefined
): string {
  if (!matches || matches.length === 0) return line
  const sorted = matches.slice().sort((a, b) => a.start - b.start)
  let cursor = 0
  let output = ''
  for (const match of sorted) {
    const start = Math.max(match.start, cursor)
    const end = Math.max(match.end, start)
    if (start > cursor) {
      output += line.slice(cursor, start)
    }
    output += `${HIGHLIGHT_OPEN}${line.slice(start, end)}${HIGHLIGHT_CLOSE}`
    cursor = end
  }
  output += line.slice(cursor)
  return output
}

function findSafeSplitIndex(
  value: string,
  maxLength: number
): number {
  if (value.length <= maxLength) return value.length
  const split = value.lastIndexOf(' ', maxLength)
  if (split > 0) return split
  return maxLength
}

function pushWrapped(
  out: string[],
  prefix: string,
  content: string,
  maxLen: number
): void {
  const available = Math.max(1, maxLen - prefix.length)
  let remaining = content
  let first = true
  while (remaining.length > 0) {
    const sliceLen = findSafeSplitIndex(remaining, available)
    const chunk = remaining.slice(0, sliceLen)
    out.push(`${first ? prefix : ' '.repeat(prefix.length)}${chunk}`)
    remaining = remaining.slice(sliceLen).replace(/^ /, '')
    first = false
  }
  if (content.length === 0) {
    out.push(prefix.trimEnd())
  }
}

function shortenLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label
  return `…${label.slice(label.length - (maxLen - 1))}`
}

function buildSearchMarkdown(
  fileMatches: FileMatches[],
  query: string
): string {
  const lines: string[] = []
  lines.push('# Search results')
  pushWrapped(lines, '', `for "${query}"`, 79)
  lines.push('')

  let linkIndex = 0
  for (const file of fileMatches) {
    for (const group of file.groups) {
      const link = `/docs?path=${encodeURIComponent(file.path)}#L${group.firstMatchLine + 1}`
      const label = shortenLabel(file.path, 60)
      const refId = `r${linkIndex}`
      linkIndex += 1
      lines.push(`## [${label}][${refId}]`)
      pushWrapped(lines, `[${refId}]: `, link, 79)
      lines.push('')
      lines.push('```')

      for (let lineIndex = group.startLine; lineIndex <= group.endLine; lineIndex += 1) {
        const lineMatches = file.matchesByLine.get(lineIndex)
        const highlighted = highlightLine(file.lines[lineIndex] ?? '', lineMatches)
        const prefix = `${String(lineIndex + 1).padStart(4, ' ')} | `
        pushWrapped(lines, prefix, highlighted, 79)
      }

      lines.push('```')
      lines.push('')
    }
  }

  return lines.join('\n')
}

function buildFileListMarkdown(
  paths: string[],
  query: string
): string {
  const lines: string[] = []
  lines.push('# Search results')
  pushWrapped(lines, '', `for "${query}"`, 79)
  lines.push('')

  let linkIndex = 0
  for (const path of paths) {
    const link = `/docs?path=${encodeURIComponent(path)}`
    const label = shortenLabel(path, 60)
    const refId = `r${linkIndex}`
    linkIndex += 1
    lines.push(`## [${label}][${refId}]`)
    pushWrapped(lines, `[${refId}]: `, link, 79)
    lines.push('')
    lines.push('```')
    pushWrapped(lines, '', 'Filename match.', 79)
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

function buildNoMatchesMarkdown(query: string): string {
  const lines: string[] = []
  lines.push('# Search results')
  pushWrapped(lines, '', `for "${query}"`, 79)
  lines.push('')
  lines.push('No matches.')
  return lines.join('\n')
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes
    .slice()
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

async function buildTree(dir: string): Promise<FileNode[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nodes: FileNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const abs = resolve(dir, entry.name)
    const rel = toPosixPath(relative(ROOT, abs))

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      const children = await buildTree(abs)
      if (children.length === 0) continue
      nodes.push({ name: entry.name, path: rel, type: 'dir', children: sortNodes(children) })
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      nodes.push({ name: entry.name, path: rel, type: 'file' })
    }
  }

  return sortNodes(nodes)
}

function findFirstFile(nodes: FileNode[]): string | null {
  for (const node of nodes) {
    if (node.type === 'file') return node.path
    const child = node.children ? findFirstFile(node.children) : null
    if (child) return child
  }
  return null
}

function collectFiles(nodes: FileNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.type === 'file') out.push(node.path)
    if (node.children) collectFiles(node.children, out)
  }
  return out
}

function filterTree(nodes: FileNode[], matches: Set<string>): FileNode[] {
  const filtered: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      if (matches.has(node.path)) filtered.push(node)
    } else if (node.children) {
      const children = filterTree(node.children, matches)
      if (children.length > 0) {
        filtered.push({ ...node, children })
      }
    }
  }
  return filtered
}

async function readMarkdown(path: string): Promise<string> {
  const abs = resolve(ROOT, path)
  if (!isWithinRoot(abs)) throw error(400, 'Invalid path')
  if (!abs.endsWith('.md')) throw error(400, 'Only markdown files are allowed')
  return readFile(abs, 'utf-8')
}

async function readMarkdownSafe(
  path: string
): Promise<{ content: string | null; error?: string }> {
  try {
    const content = await readMarkdown(path)
    return { content }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to read file'
    return { content: null, error: message }
  }
}

export const load: PageServerLoad = async ({ url }) => {
  const tree = await buildTree(ROOT)
  const searchQuery = url.searchParams.get('q')?.trim() ?? ''
  const scopeParam = url.searchParams.get('scope')
  const modeParam = url.searchParams.get('mode')
  const caseParam = url.searchParams.get('case')
  const dailyParam = url.searchParams.get('daily')
  const scope: SearchScope = scopeParam === 'docs' ? 'docs' : 'files'
  const mode: SearchMode = modeParam === 'regex' ? 'regex' : 'text'
  const caseSensitive = caseParam === 'sensitive'
  const dailyOnly = dailyParam === '1'

  let search: SearchState | null = null
  let matchPaths: Set<string> | null = null
  let filteredTree = tree
  let searchContent: string | null = null

  if (searchQuery) {
    let errorMsg: string | undefined
    let matcher: ((text: string) => boolean) | null = null
    if (mode === 'regex') {
      try {
        const regex = new RegExp(searchQuery, caseSensitive ? '' : 'i')
        matcher = (text) => regex.test(text)
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : 'Invalid regex'
      }
    } else {
      const needle = caseSensitive ? searchQuery : searchQuery.toLowerCase()
      matcher = (text) =>
        caseSensitive ? text.includes(needle) : text.toLowerCase().includes(needle)
    }

    const files = collectFiles(tree)
    matchPaths = new Set<string>()
    const fileMatches: FileMatches[] = []
    let totalMatches = 0

    if (matcher) {
      for (const path of files) {
        if (path.startsWith('day-summary/')) continue
        if (scope === 'files') {
          if (matcher(path)) matchPaths.add(path)
        } else {
          const { content } = await readMarkdownSafe(path)
          if (content && matcher(content)) {
            matchPaths.add(path)
            const lines = content.split(/\r?\n/)
            const matchesByLine = findLineMatches(lines, searchQuery, mode, caseSensitive)
            const groups = groupMatches(matchesByLine, lines.length)
            for (const list of matchesByLine.values()) {
              totalMatches += list.length
            }
            if (groups.length > 0) {
              fileMatches.push({ path, lines, groups, matchesByLine })
            }
          }
        }
      }
    }

    filteredTree =
      matcher && matchPaths ? filterTree(tree, matchPaths) : tree
    search = {
      query: searchQuery,
      scope,
      mode,
      caseSensitive,
      dailyOnly,
      count: scope === 'docs' ? totalMatches : (matcher && matchPaths ? matchPaths.size : 0),
      error: errorMsg
    }

    if (scope === 'docs' && fileMatches.length > 0) {
      searchContent = buildSearchMarkdown(fileMatches, searchQuery)
    } else if (scope === 'files' && matchPaths && matchPaths.size > 0) {
      searchContent = buildFileListMarkdown(Array.from(matchPaths), searchQuery)
    } else if (searchQuery) {
      searchContent = buildNoMatchesMarkdown(searchQuery)
    }
  }

  let selectedPath = url.searchParams.get('path')
  if (matchPaths && matchPaths.size > 0) {
    selectedPath = selectedPath && matchPaths.has(selectedPath)
      ? selectedPath
      : Array.from(matchPaths)[0]
  } else if (!selectedPath) {
    selectedPath = hasFile(filteredTree, 'lush.md') ? 'lush.md' : findFirstFile(filteredTree)
  }

  if (!selectedPath) {
    return { tree: filteredTree, selectedPath: null, content: null, search }
  }

  const renderer = buildRenderer(selectedPath)
  let content: string | null = null
  let renderError: string | undefined
  if (searchQuery && searchContent) {
    try {
      content = await marked.parse(searchContent, { renderer, gfm: true })
      selectedPath = 'search-results.md'
    } catch (err) {
      renderError = err instanceof Error ? err.message : 'Unable to render markdown'
    }
  } else {
    const { content: markdown, error: readError } = await readMarkdownSafe(selectedPath)
    if (markdown) {
      try {
        content = await marked.parse(markdown, { renderer, gfm: true })
      } catch (err) {
        renderError = err instanceof Error ? err.message : 'Unable to render markdown'
      }
    }
    if (readError) {
      renderError = readError
    }
  }
  const errorMessage = renderError

  return {
    tree: filteredTree,
    selectedPath,
    content,
    search,
    errorMessage
  }
}

export const prerender = false
