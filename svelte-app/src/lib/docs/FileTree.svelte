<script lang="ts" module>
  import type { FileNode } from './types'

export interface Props {
  tree?: FileNode[]
  activePath?: string | null
  defaultCollapsed?: string[]
  focusPath?: string | null
  class?: string
}
</script>

<script lang="ts">
  import { goto } from '$app/navigation'
  import TreeItem from './TreeItem.svelte'

  let {
    tree = [],
    activePath = null,
    defaultCollapsed = [],
    focusPath = null,
    class: className = ''
  } = $props()

  let collapsed = $state(new Set<string>())

  const dirPaths = $derived.by(() => {
    const set = new Set<string>()
    const visit = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'dir') {
          set.add(node.path)
          if (node.children) visit(node.children)
        }
      }
    }
    visit(tree)
    return set
  })

  function openAncestors(path: string | null) {
    if (!path) return
    const parts = path.split('/').filter(Boolean)
    const next = new Set(collapsed)
    let current = ''
    for (const part of parts) {
      current = current ? `${current}/${part}` : part
      if (dirPaths.has(current)) next.delete(current)
    }
    collapsed = next
  }

  $effect(() => {
    collapsed = new Set(defaultCollapsed)
  })

  $effect(() => {
    if (focusPath) openAncestors(focusPath)
  })

  $effect(() => {
    if (activePath) openAncestors(activePath)
  })

  function toggle(path: string) {
    const next = new Set(collapsed)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    collapsed = next
  }

  function select(path: string) {
    goto(`/docs?path=${encodeURIComponent(path)}`)
  }
</script>

<div class={`flex h-full min-h-0 flex-col ${className}`}>
  <div class="min-h-0 flex-1 overflow-y-auto pr-1">
    <div class="sticky top-0 z-10 mb-2 rounded-lg border border-slate-800/70 bg-slate-950/90 px-2 py-1 text-xs text-slate-300">
      {#if activePath}
        <div class="overflow-x-auto whitespace-nowrap">
          {activePath}
        </div>
      {:else}
        <div class="text-slate-500">No file selected</div>
      {/if}
    </div>
    <ul class="space-y-1 text-sm text-slate-200">
      {#each tree as node (node.path)}
        <TreeItem
          {node}
          {activePath}
          {collapsed}
          {focusPath}
          onToggle={toggle}
          onSelect={select}
        />
      {/each}
    </ul>
  </div>
</div>
