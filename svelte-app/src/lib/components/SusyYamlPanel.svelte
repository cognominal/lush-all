<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'
  import { stringify as yamlStringify } from '@lush/yaml'
  import type { SusyNode } from 'lush-types'

  const { root = null, indexer = '', filterKeys = '' } = $props<{
    root?: SusyNode | null
    indexer?: string
    filterKeys?: string
  }>()

  let host: HTMLDivElement
  let view: EditorView | null = null

  const emptyMessage = '# Susy projection will appear here.'
  const emptySelectionMessage = '# Indexer did not match any value.'

  let yamlText = $state(emptyMessage)

  // Check if a value is a plain record.
  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
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
  function weedoutKeys(value: unknown, keys: Set<string>): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => weedoutKeys(entry, keys))
    }
    if (isRecord(value)) {
      const result: Record<string, unknown> = {}
      for (const [key, entry] of Object.entries(value)) {
        if (keys.has(key)) continue
        result[key] = weedoutKeys(entry, keys)
      }
      return result
    }
    return value
  }

  // Normalize a space-separated list of filter keys.
  function normalizeFilterKeys(input: string): Set<string> {
    return new Set(input.split(/\s+/).filter(Boolean))
  }

  // Replace kind/type pairs with a fused kt key for YAML output.
  function fuseKindType(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => fuseKindType(entry))
    }
    if (isRecord(value)) {
      const kind = value.kind
      const type = value.type
      const hasPair = typeof kind === 'string' && typeof type === 'string'
      const result: Record<string, unknown> = {}
      if (hasPair) result.kt = `${kind}.${type}`
      for (const [key, entry] of Object.entries(value)) {
        if (hasPair && (key === 'kind' || key === 'type')) continue
        result[key] = fuseKindType(entry)
      }
      return result
    }
    return value
  }

  function syncView(nextDoc: string) {
    if (!view) return
    const current = view.state.doc.toString()
    if (nextDoc === current) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextDoc }
    })
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
              fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
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
    if (!root) {
      yamlText = emptyMessage
      syncView(yamlText)
      return
    }

    const picked = pickValue(root, indexer)
    if (picked === undefined) {
      yamlText = emptySelectionMessage
      syncView(yamlText)
      return
    }

    const filtered = weedoutKeys(picked, normalizeFilterKeys(filterKeys))
    const fused = fuseKindType(filtered)
    yamlText = yamlStringify(fused).trimEnd()
    syncView(yamlText)
  })

  onDestroy(() => {
    view?.destroy()
    view = null
  })
</script>

<div class="flex h-full min-h-0 flex-col gap-4 p-6">
  <div class="flex items-baseline justify-between">
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">
      Susy YAML
    </div>
    <div class="text-xs text-surface-400">
      Read-only
    </div>
  </div>

  <div class="flex-1 min-h-0 rounded-xl border border-surface-700/60 bg-surface-900/70">
    <div class="h-full min-h-0" bind:this={host}></div>
  </div>

  <div class="text-xs text-surface-400">
    Projection updates as you edit the structural tree.
  </div>
</div>
