import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'
import { parse } from '../../../../../yaml/src/index.ts'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type HighlightUpdate = {
  key: string
  value: string
}

// Resolve the repo-relative highlight YAML file path.
function getHighlightPath(): string {
  const repoRoot = fileURLToPath(new URL('../../../../..', import.meta.url))
  return path.join(repoRoot, 'svelte-codemirror', 'src', 'highlight.yaml')
}

// Normalize incoming highlight keys for consistency.
function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

// Convert a YAML mapping into a normalized string map.
function parseHighlightYaml(text: string): Map<string, string> {
  if (!text.trim()) return new Map()
  const parsed = parse(text) as unknown
  if (!parsed || typeof parsed !== 'object') return new Map()
  const map = new Map<string, string>()
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'string') {
      map.set(normalizeKey(key), value)
    }
  }
  return map
}

// Serialize highlight entries with alphabetized keys.
function serializeHighlightYaml(map: Map<string, string>): string {
  const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  if (entries.length === 0) return ''
  return `${entries.map(([key, value]) => `${key}: ${value}`).join('\n')}\n`
}

// Parse and validate the incoming highlight update payload.
function parseHighlightUpdate(body: unknown): HighlightUpdate | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Partial<HighlightUpdate>
  if (typeof record.key !== 'string' || typeof record.value !== 'string') return null
  return { key: record.key, value: record.value }
}

// Persist highlight updates to the shared YAML file.
export const POST: RequestHandler = async ({ request }) => {
  let payload: HighlightUpdate | null = null
  try {
    payload = parseHighlightUpdate(await request.json())
  } catch {
    payload = null
  }

  if (!payload) {
    return json({ error: 'Invalid highlight payload.' }, { status: 400 })
  }

  const nextKey = normalizeKey(payload.key)
  if (!nextKey) {
    return json({ error: 'Highlight key is required.' }, { status: 400 })
  }

  const highlightPath = getHighlightPath()
  const currentText = await readFile(highlightPath, 'utf8')
  const map = parseHighlightYaml(currentText)
  if (payload.value.trim()) {
    map.set(nextKey, payload.value.trim())
  } else {
    map.delete(nextKey)
  }

  await writeFile(highlightPath, serializeHighlightYaml(map), 'utf8')
  return json({ ok: true })
}
