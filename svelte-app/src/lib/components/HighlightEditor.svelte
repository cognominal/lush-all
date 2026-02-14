<script lang="ts">
  import { onDestroy, tick } from 'svelte'

  const {
    name,
    value = '',
    saving = false,
    error = null,
    placeholder = 'No highlight match',
    onCommit,
    restoreToken = 0
  } = $props<{
    name: string
    value?: string
    saving?: boolean
    error?: string | null
    placeholder?: string
    onCommit?: (nextValue: string) => void
    restoreToken?: number
  }>()

  let draft = $state('')
  let focused = $state(false)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let inputEl: HTMLInputElement | null = null
  let focusInterval: ReturnType<typeof setInterval> | null = null
  let focusTimeout: ReturnType<typeof setTimeout> | null = null

  // Keep draft synced when not actively editing.
  $effect(() => {
    if (focused) return
    if (draft === value) return
    draft = value
  })

  // Restore focus after parent-triggered updates.
  $effect(() => {
    const token = restoreToken
    if (!token) return
    tick().then(() => {
      inputEl?.focus({ preventScroll: true })
    })
  })

  // Commit the draft value when it changed.
  function commitDraft(force = false): void {
    if (!onCommit) return
    if (!force && draft === value) return
    onCommit(draft)
    startFocusSentinel()
  }

  // Track focus state for syncing behavior.
  function handleFocus(): void {
    focused = true
  }

  // Commit when focus leaves the field.
  function handleBlur(): void {
    focused = false
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    commitDraft()
  }

  // Debounce commits while typing.
  function handleInput(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      commitDraft()
    }, 250)
  }

  // Commit on Enter, using placeholder suggestion when draft is empty.
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (!onCommit) return
    if (!draft.trim() && placeholder.trim()) {
      onCommit(placeholder)
      startFocusSentinel()
      return
    }
    commitDraft(true)
  }

  // Allow parent to restore focus after external updates.
  export function focus(): void {
    inputEl?.focus({ preventScroll: true })
  }

  // Keep focus on the input for a short window after commits.
  function startFocusSentinel(): void {
    if (focusInterval) clearInterval(focusInterval)
    if (focusTimeout) clearTimeout(focusTimeout)
    focusInterval = setInterval(() => {
      if (!inputEl) return
      if (document.activeElement !== inputEl) {
        inputEl.focus({ preventScroll: true })
      }
    }, 100)
    focusTimeout = setTimeout(() => {
      if (focusInterval) clearInterval(focusInterval)
      focusInterval = null
      focusTimeout = null
    }, 1000)
  }

  // Clean up pending timers.
  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (focusInterval) clearInterval(focusInterval)
    if (focusTimeout) clearTimeout(focusTimeout)
  })
</script>

<div data-component={`HighlightEditor-${name}`} class="flex flex-col gap-2">
  <div class="flex items-center gap-2">
    <input
      class="w-full rounded-md border border-surface-700/70 bg-surface-900/70 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500"
      type="text"
      {placeholder}
      bind:this={inputEl}
      bind:value={draft}
      onfocus={handleFocus}
      oninput={handleInput}
      onblur={handleBlur}
      onkeydown={handleKeydown}
    />
    {#if saving}
      <div class="text-[11px] uppercase tracking-[0.2em] text-surface-400">
        Saving
      </div>
    {/if}
  </div>
  {#if error}
    <div class="text-xs text-amber-300">{error}</div>
  {/if}
</div>
