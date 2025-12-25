<script lang="ts" module>
  import type { FileNode } from './types'

  export interface Props {
    node: FileNode
    activePath?: string | null
    collapsed: Set<string>
    focusPath?: string | null
    onToggle: (path: string) => void
    onSelect: (path: string) => void
  }
</script>

<script lang="ts">
  import { tick } from 'svelte'
  import TreeItem from './TreeItem.svelte'

  let {
    node,
    activePath = null,
    collapsed,
    focusPath = null,
    onToggle,
    onSelect
  } = $props()

  const isDir = $derived(node.type === 'dir')
  const isOpen = $derived(!collapsed.has(node.path))
  const isActive = $derived(activePath === node.path)
  const isFocused = $derived(focusPath === node.path)

  let buttonEl: HTMLButtonElement | null = null

  $effect(() => {
    if (isFocused) {
      void tick().then(() => buttonEl?.scrollIntoView({ block: 'center' }))
    }
  })

  function handleClick() {
    if (isDir) onToggle(node.path)
    else onSelect(node.path)
  }
</script>

<li>
  <button
    class={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-slate-800 ${
      isActive ? 'bg-slate-800 text-slate-50' : 'text-slate-200'
    }`}
    onclick={handleClick}
    bind:this={buttonEl}
  >
    <span class="flex h-4 w-4 items-center justify-center">
      {#if isDir}
        <svg
          class={`h-3 w-3 transition ${isOpen ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      {:else}
        <svg
          class="h-3.5 w-3.5 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      {/if}
    </span>
    <span class="truncate">{node.name}</span>
  </button>

  {#if isDir && isOpen && node.children?.length}
    <ul class="ml-5 space-y-1 border-l border-slate-800 pl-3">
      {#each node.children as child (child.path)}
        <TreeItem
          node={child}
          {activePath}
          {collapsed}
          {focusPath}
          {onToggle}
          {onSelect}
        />
      {/each}
    </ul>
  {/if}
</li>
