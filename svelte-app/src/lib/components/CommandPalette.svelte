<script lang="ts">
  import { tick } from 'svelte'
  import {
    commandsStore,
    detectPlatform,
    filterCommands,
    formatKeybindingLabel,
    type Command,
    type WhenContext
  } from '$lib/logic/commands'

  type Props = {
    open?: boolean
    onClose?: () => void
    onExecute?: (command: Command) => void
  }

  let { open = false, onClose, onExecute }: Props = $props()

  let query = $state('')
  let selectedIdx = $state(0)
  let inputEl = $state<HTMLInputElement | null>(null)
  let wasOpen = $state(false)
  let commands = $state<Command[]>([])
  let whenContext = $state<WhenContext>({})

  const platform = detectPlatform()

  // Subscribe to the command registry updates.
  $effect(() => {
    const unsubscribe = commandsStore.subscribe((value) => {
      commands = value
    })
    return () => {
      unsubscribe()
    }
  })

  // Derive the current command list.
  const results = $derived(filterCommands(commands, query, whenContext))

  // Reset palette state on open.
  $effect(() => {
    if (open && !wasOpen) {
      wasOpen = true
      query = ''
      selectedIdx = 0
      void tick().then(() => inputEl?.focus())
    }
  })

  // Track closing transitions.
  $effect(() => {
    if (!open && wasOpen) {
      wasOpen = false
    }
  })

  // Clamp the current selection index to available items.
  function clampIndex(value: number): number {
    if (results.length === 0) return 0
    return Math.max(0, Math.min(value, results.length - 1))
  }

  // Close the palette.
  function close() {
    onClose?.()
  }

  // Execute a selected command.
  function execute(command: Command) {
    onExecute?.(command)
  }

  // Handle keyboard navigation within the palette.
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

  // Execute a command from pointer selection.
  function onSelect(command: Command) {
    execute(command)
  }

  // Close the palette when clicking the overlay.
  function onOverlayClick(event: MouseEvent) {
    if (event.currentTarget !== event.target) return
    close()
  }

  // Close the palette when the overlay captures escape.
  function onOverlayKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-surface-900/70 px-4 pt-24"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={onOverlayClick}
    onkeydown={onOverlayKeydown}
  >
    <div class="card w-full max-w-xl space-y-3 border border-surface-600/40 bg-surface-900/90 p-4">
      <div class="text-xs uppercase tracking-[0.35em] text-surface-400">Command Palette</div>

      <input
        class="input w-full bg-surface-900/60 text-surface-50"
        type="text"
        placeholder="Type a command..."
        bind:value={query}
        bind:this={inputEl}
        onkeydown={onKeyDown}
      />

      {#if results.length === 0}
        <div class="text-xs text-surface-400">No matching commands.</div>
      {:else}
        <div class="max-h-72 overflow-auto rounded-lg border border-surface-600/30" role="listbox">
          {#each results as command, idx (command.command)}
            <button
              type="button"
              class={`flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm ${
                idx === selectedIdx
                  ? 'bg-tertiary-500/20 text-surface-50'
                  : 'bg-transparent text-surface-200 hover:bg-surface-700/40'
              }`}
              role="option"
              aria-selected={idx === selectedIdx}
              onmouseenter={() => (selectedIdx = idx)}
              onclick={() => onSelect(command)}
            >
              <span class="flex flex-col">
                <span>{command.title}</span>
                {#if command.category}
                  <span class="text-xs text-surface-400">{command.category}</span>
                {/if}
              </span>
              <span class="text-xs text-surface-400">
                {formatKeybindingLabel(command.command, whenContext, platform)}
              </span>
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
