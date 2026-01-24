<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'
  import { stringify as yamlStringify } from '@lush/yaml'

  const DEFAULT_FILTER_KEYS = 'name_loc start end'

  const {
    title,
    value = null,
    emptyMessage = '# YAML will appear here.',
    emptySelectionMessage = '# Indexer did not match any value.',
    filterKeysDefault = DEFAULT_FILTER_KEYS,
    formatValue = defaultFormatValue,
    overrideYaml = null,
    footer = '',
    statusLabel = 'Read-only',
    containerClass = '',
    panelClass =
      'flex-1 min-h-0 rounded-xl border border-surface-700/60 bg-surface-900/70'
  } = $props<{
    title: string
    value?: unknown | null
    emptyMessage?: string
    emptySelectionMessage?: string
    filterKeysDefault?: string
    formatValue?: (value: unknown) => string
    overrideYaml?: string | null
    footer?: string
    statusLabel?: string
    containerClass?: string
    panelClass?: string
  }>()

  let host: HTMLDivElement
  let view: EditorView | null = null

  let indexer = $state('')
  let filterKeys = $state('')
  let filterKeysTouched = $state(false)
  let yamlText = $state('')

  // Format a value into YAML for display.
  function defaultFormatValue(input: unknown): string {
    return yamlStringify(input).trimEnd()
  }

  // Check if a value is a plain record.
  function isRecord(valueToCheck: unknown): valueToCheck is Record<string, unknown> {
    return (
      typeof valueToCheck === 'object' &&
      valueToCheck !== null &&
      !Array.isArray(valueToCheck)
    )
  }

  // Pick a nested value from a dot-separated path.
  function pickValue(rootValue: unknown, picker: string): unknown {
    if (!picker.trim()) return rootValue
    const parts = picker.split('.').filter(Boolean)
    let current: unknown = rootValue
    for (const part of parts) {
      if (current === null || current === undefined) return undefined
      if (/^\d+$/.test(part)) {
        if (!Array.isArray(current)) return undefined
        current = current[Number.parseInt(part, 10)]
        continue
      }
      if (!isRecord(current)) return undefined
      current = current[part]
    }
    return current
  }

  // Remove keys from nested arrays/objects.
  function weedoutKeys(valueToClean: unknown, keys: Set<string>): unknown {
    if (Array.isArray(valueToClean)) {
      return valueToClean.map((entry) => weedoutKeys(entry, keys))
    }
    if (isRecord(valueToClean)) {
      const result: Record<string, unknown> = {}
      for (const [key, entry] of Object.entries(valueToClean)) {
        if (keys.has(key)) continue
        result[key] = weedoutKeys(entry, keys)
      }
      return result
    }
    return valueToClean
  }

  // Normalize a space-separated list of filter keys.
  function normalizeFilterKeys(input: string): Set<string> {
    return new Set(input.split(/\s+/).filter(Boolean))
  }

  // Update the CodeMirror view when YAML changes.
  function syncView(nextDoc: string) {
    if (!view) return
    const current = view.state.doc.toString()
    if (nextDoc === current) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextDoc }
    })
  }

  // Track manual edits to filter keys.
  function markFilterKeysTouched() {
    filterKeysTouched = true
  }

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: yamlText,
        extensions: [
          basicSetup,
          yaml(),
          oneDark,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          EditorView.theme({
            '&': {
              height: '100%',
              fontFamily:
                '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '14px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)'
            },
            '.cm-content': {
              padding: '16px'
            },
            '.cm-scroller': {
              overflow: 'auto'
            }
          })
        ]
      })
    })
  })

  $effect(() => {
    if (!filterKeysTouched) {
      filterKeys = filterKeysDefault
    }
  })

  $effect(() => {
    if (overrideYaml) {
      yamlText = overrideYaml
      syncView(yamlText)
      return
    }
    if (value === null || value === undefined) {
      yamlText = emptyMessage
      syncView(yamlText)
      return
    }

    const picked = pickValue(value, indexer)
    if (picked === undefined) {
      yamlText = emptySelectionMessage
      syncView(yamlText)
      return
    }

    const filtered = weedoutKeys(picked, normalizeFilterKeys(filterKeys))
    try {
      yamlText = formatValue(filtered)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to format YAML output.'
      yamlText = `! format error: ${message}`
    }
    syncView(yamlText)
  })

  onDestroy(() => {
    view?.destroy()
    view = null
  })
</script>

<div class={`flex min-h-0 flex-col gap-4 ${containerClass}`}>
  <div class="flex items-baseline justify-between">
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">{title}</div>
    {#if statusLabel}
      <div class="text-xs text-surface-400">{statusLabel}</div>
    {/if}
  </div>

  <div class="flex flex-col gap-3">
    <label class="flex items-center gap-3 text-xs text-surface-300">
      <span
        class="w-28 shrink-0 whitespace-nowrap uppercase tracking-[0.35em] text-surface-400"
      >
        Indexer
      </span>
      <input
        class="min-w-0 flex-1 rounded-lg border border-surface-700/60 bg-surface-950/70 px-3 py-2 text-sm text-surface-100"
        placeholder="e.g. kids.0.kids.2"
        bind:value={indexer}
      />
    </label>
    <label class="flex items-center gap-3 text-xs text-surface-300">
      <span
        class="w-28 shrink-0 whitespace-nowrap uppercase tracking-[0.35em] text-surface-400"
      >
        Filter keys
      </span>
      <input
        class="min-w-0 flex-1 rounded-lg border border-surface-700/60 bg-surface-950/70 px-3 py-2 text-sm text-surface-100"
        placeholder="space separated keys"
        bind:value={filterKeys}
        oninput={markFilterKeysTouched}
      />
    </label>
  </div>

  <div class={panelClass}>
    <div class="h-full min-h-0" bind:this={host}></div>
  </div>

  {#if footer}
    <div class="text-xs text-surface-400">{footer}</div>
  {/if}
</div>
