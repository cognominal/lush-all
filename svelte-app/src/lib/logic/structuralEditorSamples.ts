import {
  susyJsProjection,
  susyRuleprojProjection,
  susySvelteLesteProjection,
  susySvelteProjection,
  susyTsProjection,
  susyYamlProjection
} from 'lush-types'
import type { SusyNode } from '@lush/structural'

export type ProjectionLanguage = 'svelte' | 'js' | 'ts' | 'yaml' | 'ruleproj'

export type ProjectionConfig = {
  language: ProjectionLanguage
  label: string
  project: (source: string) => SusyNode
}

export const PROJECTION_BY_LANGUAGE: Record<ProjectionLanguage, ProjectionConfig> = {
  svelte: {
    language: 'svelte',
    label: 'Svelte',
    project: susySvelteProjection
  },
  js: {
    language: 'js',
    label: 'JavaScript',
    project: susyJsProjection
  },
  ts: {
    language: 'ts',
    label: 'TypeScript',
    project: susyTsProjection
  },
  yaml: {
    language: 'yaml',
    label: 'YAML',
    project: susyYamlProjection
  },
  ruleproj: {
    language: 'ruleproj',
    label: 'Ruleproj',
    project: susyRuleprojProjection
  }
}

export const DEFAULT_SAMPLE_OPTION = ''
export const DEFAULT_RULEPROJ_SAMPLE = 'svelte-leste.ruleproj'
export const STORAGE_KEY = 'lush.editor.selection'

export type PersistedEditorSelection = {
  anchor: number
  head: number
}

export type PersistedEditorSession = {
  language: ProjectionLanguage
  sample: string
  theme: string | null
  sampleMtimeMs: number | null
  selection: PersistedEditorSelection | null
}

export type SampleOption = {
  label: string
  value: string
  extension: string
  language: ProjectionLanguage | null
  supported: boolean
}

export type LanguageOption = {
  id: string
  label: string
  extension: string
  language: ProjectionLanguage | null
  supported: boolean
}

export const sampleContent = import.meta.glob<string>(
  '../samples/*.{svelte,js,ts,yaml,ruleproj,leste}',
  {
    eager: true,
    query: '?raw',
    import: 'default'
  }
)

// Read the file extension from a sample path.
function getFileExtension(path: string): string {
  const name = path.split('/').pop() ?? path
  const parts = name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

// Resolve a projection config for a file extension.
export function getProjectionForExtension(extension: string): ProjectionConfig | null {
  const lookup = PROJECTION_BY_LANGUAGE as Record<string, ProjectionConfig | undefined>
  return lookup[extension] ?? null
}

// Resolve a projection config for a supported language.
export function getProjectionForLanguage(
  language: ProjectionLanguage
): ProjectionConfig {
  return PROJECTION_BY_LANGUAGE[language]
}

// Format a file path into a readable label.
function formatSampleLabel(path: string, extension: string): string {
  const name = path.split('/').pop() ?? path
  const stem = name.replace(/\.[^.]+$/, '')
  return `Sample: ${stem} (${extension})`
}

// Build sample options from the discovered file list.
export function buildSampleOptions(): SampleOption[] {
  return Object.keys(sampleContent)
    .sort((a, b) => a.localeCompare(b))
    .map((path) => {
      const extension = getFileExtension(path)
      const projection = getProjectionForExtension(extension)
      return {
        label: formatSampleLabel(path, extension || 'unknown'),
        value: path,
        extension,
        language: projection?.language ?? null,
        supported: Boolean(projection)
      }
    })
}

export const SAMPLE_OPTIONS = buildSampleOptions()

// Build language options from sample extensions.
export function buildLanguageOptions(samples: SampleOption[]): LanguageOption[] {
  const seen = new Set<string>()
  const options: LanguageOption[] = []
  for (const sample of samples) {
    if (seen.has(sample.extension)) continue
    seen.add(sample.extension)
    const projection = getProjectionForExtension(sample.extension)
    if (projection) {
      options.push({
        id: projection.language,
        label: projection.label,
        extension: sample.extension,
        language: projection.language,
        supported: true
      })
    } else {
      const label = sample.extension ? sample.extension.toUpperCase() : 'Unknown'
      options.push({
        id: `ext:${sample.extension || 'unknown'}`,
        label,
        extension: sample.extension,
        language: null,
        supported: false
      })
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

export const LANGUAGE_OPTIONS = buildLanguageOptions(SAMPLE_OPTIONS)

// Pick the default language from the supported options.
export function pickDefaultLanguage(
  options: LanguageOption[],
  fallback: ProjectionLanguage
): ProjectionLanguage {
  const preferred = options.find(
    (option) => option.supported && option.language === fallback
  )
  if (preferred?.language) return preferred.language
  const supported = options.find(
    (option) => option.supported && option.language
  )
  return supported?.language ?? fallback
}

export const DEFAULT_LANGUAGE = pickDefaultLanguage(LANGUAGE_OPTIONS, 'svelte')

// Find the default ruleproj sample path if it exists.
export function findRuleprojSamplePath(options: SampleOption[]): string | null {
  const match = options.find((option) =>
    option.value.endsWith(DEFAULT_RULEPROJ_SAMPLE)
  )
  return match?.value ?? null
}

// Find the shortest sample for the selected language.
export function findShortestSample(
  options: SampleOption[],
  content: Record<string, string>,
  language: ProjectionLanguage
): SampleOption | null {
  let best: SampleOption | null = null
  let bestLength = Number.POSITIVE_INFINITY
  for (const option of options) {
    if (!option.supported || option.language !== language) continue
    const text = content[option.value] ?? ''
    if (text.length >= bestLength) continue
    best = option
    bestLength = text.length
  }
  return best
}

// Guard that a string is a supported projection language.
export function isProjectionLanguage(value: string): value is ProjectionLanguage {
  return value in PROJECTION_BY_LANGUAGE
}

// Normalize a language against the available sample extensions.
export function normalizeLanguage(
  language: ProjectionLanguage,
  options: LanguageOption[],
  fallback: ProjectionLanguage
): ProjectionLanguage {
  const supported = options.some(
    (option) => option.supported && option.language === language
  )
  return supported ? language : fallback
}

// Read persisted selection from local storage.
export function readPersistedSelection(): {
  language: ProjectionLanguage
  sample: string
} | null {
  const session = readPersistedEditorSession()
  if (!session) return null
  return {
    language: session.language,
    sample: session.sample
  }
}

// Read the persisted editor session from local storage.
export function readPersistedEditorSession(): PersistedEditorSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as {
      language?: unknown
      sample?: unknown
      theme?: unknown
      sampleMtimeMs?: unknown
      selection?: unknown
    }
    const language = record.language
    const sample = record.sample
    if (typeof language !== 'string' || !isProjectionLanguage(language)) {
      return null
    }
    const theme = readPersistedTheme(record)
    const sampleMtimeMs = readPersistedSampleMtime(record)
    const selection = readPersistedSelectionRange(record)
    return {
      language,
      sample: typeof sample === 'string' ? sample : DEFAULT_SAMPLE_OPTION,
      theme,
      sampleMtimeMs,
      selection
    }
  } catch {
    return null
  }
}

// Read the persisted theme if present.
function readPersistedTheme(record: { theme?: unknown }): string | null {
  return typeof record.theme === 'string' ? record.theme : null
}

// Read the persisted sample mtime if present.
function readPersistedSampleMtime(record: { sampleMtimeMs?: unknown }): number | null {
  return typeof record.sampleMtimeMs === 'number' && Number.isFinite(record.sampleMtimeMs)
    ? record.sampleMtimeMs
    : null
}

// Read the persisted editor selection if present.
function readPersistedSelectionRange(
  record: { selection?: unknown }
): PersistedEditorSelection | null {
  if (!record.selection || typeof record.selection !== 'object') return null
  const parsed = record.selection as { anchor?: unknown; head?: unknown }
  if (typeof parsed.anchor !== 'number' || typeof parsed.head !== 'number') {
    return null
  }
  if (!Number.isFinite(parsed.anchor) || !Number.isFinite(parsed.head)) {
    return null
  }
  return {
    anchor: parsed.anchor,
    head: parsed.head
  }
}

// Build a projection from source and optional ruleproj text.
export function projectSource(
  language: ProjectionLanguage,
  source: string,
  ruleprojText: string | null
): SusyNode {
  return language === 'svelte' && ruleprojText
    ? susySvelteLesteProjection(source, ruleprojText)
    : getProjectionForLanguage(language).project(source)
}
