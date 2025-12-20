<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { commandsStore, filterCommands, type Command } from '$lib/logic/commands'

  export let open = false
  export let onClose: (() => void) | undefined = undefined
  export let onExecute: ((command: Command) => void) | undefined = undefined

  let query = ''
  let selectedIdx = 0
  let inputEl: HTMLInputElement | null = null

  let wasOpen = false
  let commands: Command[] = []
  const unsubscribe = commandsStore.subscribe((value) => {
    commands = value
  })
  onDestroy(() => {
    unsubscribe()
  })

  $: results = filterCommands(commands, query)

  $: if (open && !wasOpen) {
    wasOpen = true
    query = ''
    selectedIdx = 0
    void tick().then(() => inputEl?.focus())
  }

  $: if (!open && wasOpen) {
    wasOpen = false
  }

  function clampIndex(value: number): number {
    if (results.length === 0) return 0
    return Math.max(0, Math.min(value, results.length - 1))
  }

  function close() {
    onClose?.()
  }

  function execute(command: Command) {
    onExecute?.(command)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedIdx = clampIndex(selectedIdx + 1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedIdx = clampIndex(selectedIdx - 1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const command = results[selectedIdx]
      if (command) execute(command)
    }
  }

  function onSelect(command: Command) {
    execute(command)
  }

  function onOverlayClick(event: MouseEvent) {
    if (event.currentTarget !== event.target) return
    close()
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-surface-900/70 px-4 pt-24"
    role="dialog"
    aria-modal="true"
    on:click={onOverlayClick}
  >
    <div class="card w-full max-w-xl space-y-3 border border-surface-600/40 bg-surface-900/90 p-4">
      <div class="text-xs uppercase tracking-[0.35em] text-surface-400">Command Palette</div>

      <input
        class="input w-full bg-surface-900/60 text-surface-50"
        type="text"
        placeholder="Type a command..."
        bind:value={query}
        bind:this={inputEl}
        on:keydown={onKeyDown}
      />

      {#if results.length === 0}
        <div class="text-xs text-surface-400">No matching commands.</div>
      {:else}
        <div class="max-h-72 overflow-auto rounded-lg border border-surface-600/30">
          {#each results as command, idx (command.id)}
            <button
              type="button"
              class={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                idx === selectedIdx
                  ? 'bg-tertiary-500/20 text-surface-50'
                  : 'bg-transparent text-surface-200 hover:bg-surface-700/40'
              }`}
              on:mouseenter={() => (selectedIdx = idx)}
              on:click={() => onSelect(command)}
            >
              <span>{command.label}</span>
              {#if command.group}
                <span class="text-xs text-surface-400">{command.group}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .input:focus {
    outline: 2px solid rgba(var(--color-tertiary-400) / 0.6);
    outline-offset: 2px;
  }
</style>
