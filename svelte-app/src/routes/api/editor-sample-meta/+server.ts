import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RequestHandler } from '@sveltejs/kit'
import { json } from '@sveltejs/kit'

const SAMPLE_KEY_PREFIX = '../samples/'
const SAMPLE_NAME_PATTERN = /^[A-Za-z0-9._-]+\.(svelte|js|ts|yaml|ruleproj|leste)$/
const SAMPLE_DIR = fileURLToPath(new URL('../../../lib/samples/', import.meta.url))

// Resolve a persisted sample key to a safe sample file path.
function resolveSampleFilePath(sampleKey: string): string | null {
  if (!sampleKey.startsWith(SAMPLE_KEY_PREFIX)) return null
  const fileName = sampleKey.slice(SAMPLE_KEY_PREFIX.length)
  if (!SAMPLE_NAME_PATTERN.test(fileName)) return null
  return path.join(SAMPLE_DIR, fileName)
}

// Return last-modified metadata for a bundled editor sample.
export const GET: RequestHandler = async ({ url }) => {
  const sample = url.searchParams.get('sample')
  if (!sample) {
    return json({ error: 'Missing sample parameter.' }, { status: 400 })
  }
  const filePath = resolveSampleFilePath(sample)
  if (!filePath) {
    return json({ error: 'Invalid sample path.' }, { status: 400 })
  }
  try {
    const info = await stat(filePath)
    return json({
      sample,
      mtimeMs: info.mtimeMs,
      mtimeIso: info.mtime.toISOString()
    })
  } catch {
    return json({ error: 'Sample not found.' }, { status: 404 })
  }
}
