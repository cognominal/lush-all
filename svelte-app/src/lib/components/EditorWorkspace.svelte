<script lang="ts">
  import StructuralEditor from '$lib/components/StructuralEditor.svelte'
  import SusyYamlPanel from '$lib/components/SusyYamlPanel.svelte'
  import type { SusyNode } from 'lush-types'
  import { serializePath } from '@lush/structural'

  const DEFAULT_FILTER_KEYS = 'name_loc start end'

  let root = $state<SusyNode | null>(null)
  let indexer = $state('')
  let filterKeys = $state(DEFAULT_FILTER_KEYS)
  let activePath = $state<number[] | null>(null)
  let focusPathCount = $state(0)
  let structuralEditorRef = $state<{
    setActivePath?: (path: number[] | null) => void
  } | null>(null)

  // Expose the active path for devtools diagnostics.
  function updateDebugActivePath(nextPath: number[] | null): void {
    if (!import.meta.env.DEV) return
    const target = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
      __editorWorkspaceFocusPathCount?: number
      __editorWorkspaceHasStructuralRef?: boolean
      __editorWorkspaceFocusSource?: string
    }
    target.__editorWorkspaceActivePath = nextPath
    target.__editorWorkspaceFocusPathCount = focusPathCount
    target.__editorWorkspaceHasStructuralRef = Boolean(structuralEditorRef?.setActivePath)
  }

  // Update the shared focus path for both panels.
  function applyFocusPath(path: number[], source: string, syncStructural: boolean): void {
    const nextPath = [...path]
    const nextKey = serializePath(nextPath)
    const currentKey = activePath ? serializePath(activePath) : null
    if (currentKey === nextKey) return
    activePath = nextPath
    focusPathCount += 1
    if (import.meta.env.DEV) {
      const target = window as Window & { __editorWorkspaceFocusSource?: string }
      target.__editorWorkspaceFocusSource = source
    }
    updateDebugActivePath(activePath)
    if (syncStructural) {
      structuralEditorRef?.setActivePath?.(activePath)
    }
  }

  // Route focus changes coming from the structural editor.
  function handleStructuralFocusPath(path: number[]): void {
    applyFocusPath(path, 'structural', false)
  }

  // Route focus changes coming from the YAML panel.
  function handleYamlFocusPath(path: number[]): void {
    applyFocusPath(path, 'yaml', true)
  }

  $effect(() => {
    updateDebugActivePath(activePath)
  })
</script>

<div data-svelte-cmpnm="EditorWorkspace" class="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
  <div class="min-h-0 flex-1">
    <StructuralEditor
      bind:this={structuralEditorRef}
      onFocusPath={handleStructuralFocusPath}
      onRootChange={(nextRoot) => (root = nextRoot)}
    />
  </div>
  <div class="min-h-0 flex flex-1 flex-col">
    <div class="flex flex-col gap-3 px-6 pt-6">
      <label class="flex flex-col gap-2 text-xs text-surface-300">
        <span class="uppercase tracking-[0.35em] text-surface-400">Indexer</span>
        <input
          class="w-full rounded-lg border border-surface-700/60 bg-surface-950/70 px-3 py-2 text-sm text-surface-100"
          placeholder="e.g. kids.0.kids.2"
          bind:value={indexer}
        />
      </label>
      <label class="flex flex-col gap-2 text-xs text-surface-300">
        <span class="uppercase tracking-[0.35em] text-surface-400">
          Filter keys
        </span>
        <input
          class="w-full rounded-lg border border-surface-700/60 bg-surface-950/70 px-3 py-2 text-sm text-surface-100"
          placeholder="space separated keys"
          bind:value={filterKeys}
        />
      </label>
    </div>
    <div class="min-h-0 flex-1">
      <SusyYamlPanel
        {root}
        {indexer}
        {activePath}
        filterKeys={filterKeys}
        onFocusPath={handleYamlFocusPath}
      />
    </div>
  </div>
</div>
