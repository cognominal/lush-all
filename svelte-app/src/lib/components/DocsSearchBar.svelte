<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import SearchHistoryDropdown from '$lib/components/SearchHistoryDropdown.svelte'

  type SearchState = {
    query: string
    scope: 'files' | 'docs'
    mode: 'text' | 'regex'
    caseSensitive: boolean
    dailyOnly: boolean
    count: number
    error?: string
  }

  type Props = {
    selectedPath: string | null
    search?: SearchState | null
  }

  const { selectedPath, search } = $props<Props>()

  let query = $state('')
  let scope = $state<'files' | 'docs'>('files')
  let mode = $state<'text' | 'regex'>('text')
  let caseSensitive = $state(false)
  let dailyOnly = $state(false)
  let history = $state<SearchHistoryEntry[]>([])
  let historyIndex = $state<number | null>(null)
  let showHistory = $state(false)

  type SearchHistoryEntry = {
    query: string
    scope: 'files' | 'docs'
    mode: 'text' | 'regex'
    caseSensitive: boolean
    dailyOnly: boolean
  }

  const HISTORY_KEY = 'docs-search-history'
  const HISTORY_LIMIT = 50

  const filteredHistory = $derived.by<SearchHistoryEntry[]>(() => {
    const needle = query.trim()
    if (!needle) return history
    const lower = needle.toLowerCase()
    return history.filter((entry) => entry.query.toLowerCase().includes(lower))
  })

  function submitSearch(
    event?: SubmitEvent,
    options: { skipHistory?: boolean; keepHistoryOpen?: boolean } = {}
  ) {
    event?.preventDefault()
    if (!options.keepHistoryOpen) {
      showHistory = false
      historyIndex = null
    }
    const params = new URLSearchParams()
    const trimmed = query.trim()
    if (trimmed) {
      params.set('q', trimmed)
      params.set('scope', scope)
      params.set('mode', mode)
      params.set('case', caseSensitive ? 'sensitive' : 'insensitive')
      if (dailyOnly) params.set('daily', '1')
      if (!options.skipHistory) {
        pushHistory({
          query: trimmed,
          scope,
          mode,
          caseSensitive,
          dailyOnly
        })
      }
    } else if (selectedPath) {
      params.set('path', selectedPath)
    }
    void goto(`/docs?${params.toString()}`)
  }

  $effect(() => {
    query = search?.query ?? ''
    scope = search?.scope ?? 'files'
    mode = search?.mode ?? 'text'
    caseSensitive = search?.caseSensitive ?? false
    dailyOnly = search?.dailyOnly ?? false
    historyIndex = null
  })

  onMount(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      history = parsed
        .filter((entry) =>
          entry &&
          typeof entry.query === 'string' &&
          (entry.scope === 'files' || entry.scope === 'docs') &&
          (entry.mode === 'text' || entry.mode === 'regex') &&
          typeof entry.caseSensitive === 'boolean' &&
          typeof entry.dailyOnly === 'boolean'
        )
        .slice(-HISTORY_LIMIT)
    } catch {
      // Ignore malformed local history data.
    }
  })

  function persistHistory(entries: SearchHistoryEntry[]) {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
    } catch {
      // Ignore localStorage errors (quota, privacy mode).
    }
  }

  function pushHistory(entry: SearchHistoryEntry) {
    if (!entry.query) return
    const next = [
      ...history.filter(
        (item) =>
          !(
            item.query === entry.query &&
            item.scope === entry.scope &&
            item.mode === entry.mode &&
            item.caseSensitive === entry.caseSensitive &&
            item.dailyOnly === entry.dailyOnly
          )
      ),
      entry
    ].slice(-HISTORY_LIMIT)
    history = next
    persistHistory(next)
  }

  function handleHistoryKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    if (filteredHistory.length === 0) return

    const delta = event.key === 'ArrowUp' ? -1 : 1
    const startIndex = historyIndex ?? filteredHistory.length
    const nextIndex = Math.max(0, Math.min(filteredHistory.length - 1, startIndex + delta))
    if (historyIndex !== null && nextIndex === historyIndex) return

    event.preventDefault()
    showHistory = true
    historyIndex = nextIndex
    const entry = filteredHistory[nextIndex]
    query = entry.query
    scope = entry.scope
    mode = entry.mode
    caseSensitive = entry.caseSensitive
    dailyOnly = entry.dailyOnly
    submitSearch(undefined, { skipHistory: true, keepHistoryOpen: true })
  }

  function applyHistoryEntry(entry: SearchHistoryEntry) {
    query = entry.query
    scope = entry.scope
    mode = entry.mode
    caseSensitive = entry.caseSensitive
    dailyOnly = entry.dailyOnly
    historyIndex = null
    showHistory = false
    submitSearch(undefined, { skipHistory: true, keepHistoryOpen: true })
  }
</script>

<form class="flex flex-1 flex-wrap items-center justify-end gap-3" onsubmit={submitSearch}>
  <div class="relative flex min-w-[50ch] flex-1 items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-200">
    <svg
      class="h-4 w-4 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
    <div class="w-full">
      <input
        class="h-7 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        type="text"
        name="q"
        placeholder="Search docs..."
        bind:value={query}
        onkeydown={handleHistoryKeydown}
        oninput={() => {
          showHistory = true
          historyIndex = null
        }}
        onfocus={() => {
          showHistory = true
        }}
        onblur={() => {
          window.setTimeout(() => {
            showHistory = false
            historyIndex = null
          }, 100)
        }}
      />
      <SearchHistoryDropdown
        entries={filteredHistory}
        open={showHistory}
        highlightedIndex={historyIndex}
        onSelect={applyHistoryEntry}
      />
    </div>
  </div>
  <div class="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:flex-nowrap lg:items-center">
    <div class="flex w-full items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 p-1 text-xs lg:w-auto">
      <button
        type="button"
        class={`rounded-full px-3 py-1 ${scope === 'files' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        onclick={() => (scope = 'files')}
      >
        Filenames
      </button>
      <button
        type="button"
        class={`rounded-full px-3 py-1 ${scope === 'docs' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        onclick={() => (scope = 'docs')}
      >
        Docs
      </button>
    </div>
    <div class="flex w-full items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 p-1 text-xs lg:w-auto">
      <button
        type="button"
        class={`rounded-full px-3 py-1 ${mode === 'text' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        onclick={() => (mode = 'text')}
      >
        Text
      </button>
      <button
        type="button"
        class={`rounded-full px-3 py-1 ${mode === 'regex' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        onclick={() => (mode = 'regex')}
      >
        Regex
      </button>
    </div>
    <div class="flex w-full items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 p-1 text-xs lg:w-auto">
      <button
        type="button"
        class={`rounded-full px-3 py-1 ${caseSensitive ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        onclick={() => {
          caseSensitive = !caseSensitive
          submitSearch()
        }}
      >
        Case Sensitive
      </button>
    </div>
    <div class="flex w-full items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 p-1 text-xs lg:w-auto">
      <button
        type="button"
        class={`rounded-full px-3 py-1 ${dailyOnly ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        onclick={() => {
          dailyOnly = !dailyOnly
          submitSearch()
        }}
      >
        Daily Summary
      </button>
    </div>
    <button
      type="submit"
      class="w-full rounded-full border border-slate-700/60 bg-slate-900/80 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-200 lg:w-auto"
    >
      Search
    </button>
    <button
      type="button"
      class="w-full rounded-full border border-slate-700/60 bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-400 lg:w-auto"
      onclick={(event) => {
        event.preventDefault()
        query = ''
        scope = 'files'
        mode = 'text'
        caseSensitive = false
        dailyOnly = false
        void goto('/docs')
      }}
    >
      Clear
    </button>
  </div>
</form>
