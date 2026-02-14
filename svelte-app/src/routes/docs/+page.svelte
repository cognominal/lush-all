<script lang="ts">
  import FileTree from '$lib/docs/FileTree.svelte'
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import DocsSearchBar from '$lib/components/DocsSearchBar.svelte'
  import type { PageData } from './$types'
  import { SplitPane } from '@rich_harris/svelte-split-pane'

  type Props = { data: PageData }
  const { data } = $props() as Props

  let focusPath = $state<string | null>(null)

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
</script>

<svelte:head>
  <title>Docs</title>
</svelte:head>

<div class="box-border flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6">
  <div class="min-h-0 flex-1 overflow-y-auto">
    <div class="sticky top-0 z-20 bg-slate-950/90 pb-4 pt-2 backdrop-blur">
      <div class="flex items-center justify-between gap-4">
        <div class="text-xs uppercase tracking-[0.35em] text-surface-400">Docs</div>
        <DocsSearchBar selectedPath={data.selectedPath} search={data.search} />
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-4 pt-4">
      <div class="min-h-0 flex-1 h-full">
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
          <aside class="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
            <FileTree
              class="min-h-0 flex-1"
              tree={data.tree}
              activePath={data.selectedPath}
              defaultCollapsed={['summaries', 'day-summary']}
              {focusPath}
            />
          </aside>
        {/snippet}

        {#snippet b()}
          <section class="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6">
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

      <BreadcrumbBar name="docs-main" items={crumbs} onSelect={handleCrumbSelect} />
    </div>
  </div>
</div>
