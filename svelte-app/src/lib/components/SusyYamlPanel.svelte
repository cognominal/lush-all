<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'
  import { stringify as yamlStringify } from '@lush/yaml'
  import type { SusyNode } from 'lush-types'

  const { root = null } = $props<{ root?: SusyNode | null }>()

  let host: HTMLDivElement
  let view: EditorView | null = null

  const emptyMessage = '# Susy projection will appear here.'

  let yamlText = $state(emptyMessage)

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
    yamlText = root ? yamlStringify(root).trimEnd() : emptyMessage
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
