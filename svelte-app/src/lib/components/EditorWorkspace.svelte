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
  let structuralEditorRef: {
    setActivePath?: (path: number[] | null) => void
  } | null = null

  // Expose the active path for devtools diagnostics.
  function updateDebugActivePath(nextPath: number[] | null): void {
    if (!import.meta.env.DEV) return
    const target = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
      __editorWorkspaceFocusPathCount?: number
    }
    target.__editorWorkspaceActivePath = nextPath
    target.__editorWorkspaceFocusPathCount = focusPathCount
  }

  // Update the shared focus path for both panels.
  function handleFocusPath(path: number[]): void {
    const nextKey = serializePath(path)
    const currentKey = activePath ? serializePath(activePath) : null
    if (currentKey === nextKey) return
    activePath = path
    focusPathCount += 1
    updateDebugActivePath(activePath)
    structuralEditorRef?.setActivePath?.(activePath)
  }

  $effect(() => {
    updateDebugActivePath(activePath)
  })
</script>

<div class="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
  <div class="min-h-0 flex-1">
    <StructuralEditor
      bind:this={structuralEditorRef}
      {activePath}
      onFocusPath={handleFocusPath}
      on:rootChange={(event) => (root = event.detail)}
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
        onFocusPath={handleFocusPath}
      />
    </div>
  </div>
</div>
