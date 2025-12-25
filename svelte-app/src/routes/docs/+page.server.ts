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
    `<code class="rounded bg-slate-800/70 px-1 py-0.5 text-xs text-amber-200">${token.text}</code>`

  renderer.code = function (token) {
    const language = token.lang ? `language-${token.lang}` : 'language-text'
    return `<pre class="mt-4 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200"><code class="${language}">${token.text}</code></pre>`
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

type SearchScope = 'files' | 'docs'
type SearchMode = 'text' | 'regex'

type SearchState = {
  query: string
  scope: SearchScope
  mode: SearchMode
  count: number
  error?: string
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
  const scope: SearchScope = scopeParam === 'docs' ? 'docs' : 'files'
  const mode: SearchMode = modeParam === 'regex' ? 'regex' : 'text'

  let search: SearchState | null = null
  let matchPaths: Set<string> | null = null
  let filteredTree = tree

  if (searchQuery) {
    let errorMsg: string | undefined
    let matcher: ((text: string) => boolean) | null = null
    if (mode === 'regex') {
      try {
        const regex = new RegExp(searchQuery, 'i')
        matcher = (text) => regex.test(text)
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : 'Invalid regex'
      }
    } else {
      const needle = searchQuery.toLowerCase()
      matcher = (text) => text.toLowerCase().includes(needle)
    }

    const files = collectFiles(tree)
    matchPaths = new Set<string>()

    if (matcher) {
      for (const path of files) {
        if (scope === 'files') {
          if (matcher(path)) matchPaths.add(path)
        } else {
          const { content } = await readMarkdownSafe(path)
          if (content && matcher(content)) matchPaths.add(path)
        }
      }
    }

    filteredTree =
      matcher && matchPaths ? filterTree(tree, matchPaths) : tree
    search = {
      query: searchQuery,
      scope,
      mode,
      count: matcher && matchPaths ? matchPaths.size : 0,
      error: errorMsg
    }
  }

  let selectedPath = url.searchParams.get('path')
  if (matchPaths && matchPaths.size > 0) {
    selectedPath = selectedPath && matchPaths.has(selectedPath)
      ? selectedPath
      : Array.from(matchPaths)[0]
  } else if (!selectedPath) {
    selectedPath = findFirstFile(filteredTree)
  }

  if (!selectedPath) {
    return { tree: filteredTree, selectedPath: null, content: null, search }
  }

  const { content: markdown, error: readError } = await readMarkdownSafe(selectedPath)
  const renderer = buildRenderer(selectedPath)
  let content: string | null = null
  let renderError: string | undefined
  if (markdown) {
    try {
      content = await marked.parse(markdown, { renderer, gfm: true })
    } catch (err) {
      renderError = err instanceof Error ? err.message : 'Unable to render markdown'
    }
  }

  const errorMessage = readError ?? renderError

  return {
    tree: filteredTree,
    selectedPath,
    content,
    search,
    errorMessage
  }
}

export const prerender = false
