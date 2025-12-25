<script lang="ts">
  import FileTree from '$lib/docs/FileTree.svelte'
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import type { PageData } from './$types'
  import { SplitPane } from '@rich_harris/svelte-split-pane'
  import { goto } from '$app/navigation'

  type Props = { data: PageData }
  const { data } = $props() as Props

  let focusPath = $state<string | null>(null)
  let query = $state('')
  let scope = $state<'files' | 'docs'>('files')
  let mode = $state<'text' | 'regex'>('text')

  type Crumb = { type: string; range: null; value: string }

  const crumbs = $derived.by<Crumb[]>(() => {
    if (!data.selectedPath) return []
    const parts: string[] = data.selectedPath.split('/').filter(Boolean)
    let current = ''
    return parts.map((part: string) => {
      current = current ? `${current}/${part}` : part
      return { type: part, range: null, value: current }
    })
  })

  function handleCrumbSelect(value: string) {
    if (value === data.selectedPath) return
    focusPath = value
  }

  function submitSearch(event?: SubmitEvent) {
    event?.preventDefault()
    const params = new URLSearchParams()
    const trimmed = query.trim()
    if (trimmed) {
      params.set('q', trimmed)
      params.set('scope', scope)
      params.set('mode', mode)
    } else if (data.selectedPath) {
      params.set('path', data.selectedPath)
    }
    void goto(`/docs?${params.toString()}`)
  }

  $effect(() => {
    query = data.search?.query ?? ''
    scope = data.search?.scope ?? 'files'
    mode = data.search?.mode ?? 'text'
  })
</script>

<svelte:head>
  <title>Docs</title>
</svelte:head>

<div class="flex h-full min-h-[70vh] flex-col gap-6 p-6">
  <div class="flex items-center justify-between gap-4">
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">Docs</div>
    <form class="flex flex-1 items-center justify-end gap-3" onsubmit={submitSearch}>
      <div class="flex flex-1 items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-200">
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
        <input
          class="h-7 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          type="text"
          name="q"
          placeholder="Search docs..."
          bind:value={query}
        />
      </div>
      <div class="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 p-1 text-xs">
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
      <div class="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 p-1 text-xs">
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
      <button
        type="submit"
        class="rounded-full border border-slate-700/60 bg-slate-900/80 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-200"
      >
        Search
      </button>
      <button
        type="button"
        class="rounded-full border border-slate-700/60 bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-400"
        onclick={() => {
          query = ''
          void goto('/docs')
        }}
      >
        Clear
      </button>
    </form>
  </div>

  <div class="min-h-0 flex-1">
    <SplitPane
      type="horizontal"
      id="docs"
      min="240px"
      max="-240px"
      pos="25%"
      --color="rgba(var(--color-surface-500) / 0.25)"
      --thickness="14px"
    >
      {#snippet a()}
        <aside class="h-full min-h-0 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
          <FileTree
            tree={data.tree}
            activePath={data.selectedPath}
            defaultCollapsed={['summaries', 'day-summary']}
            {focusPath}
          />
        </aside>
      {/snippet}

      {#snippet b()}
        <section class="h-full min-h-0 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6">
          {#if data.search?.error}
            <div class="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {data.search.error}
            </div>
          {/if}
          {#if data.errorMessage}
            <div class="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {data.errorMessage}
            </div>
          {/if}
          {#if data.search?.query}
            <div class="mt-3 text-xs text-slate-400">
              {data.search.count} result{data.search.count === 1 ? '' : 's'} for “{data.search.query}”
            </div>
          {/if}
          {#if data.selectedPath && data.content}
            <div class="mt-4 text-xs uppercase tracking-[0.3em] text-slate-400">
              {data.selectedPath}
            </div>
            <div class="docs-markdown mt-4">
              {@html data.content}
            </div>
          {:else}
            <div class="text-sm text-slate-300">No markdown file found.</div>
          {/if}
        </section>
      {/snippet}
    </SplitPane>
  </div>

  <BreadcrumbBar items={crumbs} onSelect={handleCrumbSelect} />
</div>
