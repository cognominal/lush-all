<script lang="ts" module>
  export interface Props {
    entries: SearchHistoryEntry[]
    open: boolean
    highlightedIndex: number | null
    onSelect: (entry: SearchHistoryEntry) => void
  }

  export interface SearchHistoryEntry {
    query: string
    scope: 'files' | 'docs'
    mode: 'text' | 'regex'
    caseSensitive: boolean
    dailyOnly: boolean
  }
</script>

<script lang="ts">
  let { entries, open, highlightedIndex, onSelect } = $props()
</script>

{#if open && entries.length > 0}
  <div class="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/95 shadow-xl">
    <ul class="max-h-64 overflow-auto py-2 text-xs text-slate-200">
      {#each entries as entry, index (entry.query + entry.scope + entry.mode + entry.caseSensitive + entry.dailyOnly + index)}
        <li>
          <button
            type="button"
            class={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left ${
              highlightedIndex === index ? 'bg-slate-800/70 text-slate-100' : 'hover:bg-slate-900/70'
            }`}
            onclick={() => onSelect(entry)}
          >
            <span class="truncate">{entry.query}</span>
            <span class="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <span class="rounded-full border border-slate-700/60 px-2 py-0.5">
                {entry.scope}
              </span>
              <span class="rounded-full border border-slate-700/60 px-2 py-0.5">
                {entry.mode}
              </span>
              <span class="rounded-full border border-slate-700/60 px-2 py-0.5">
                {entry.caseSensitive ? 'case' : 'nocase'}
              </span>
              <span class="rounded-full border border-slate-700/60 px-2 py-0.5">
                {entry.dailyOnly ? 'daily' : 'all'}
              </span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
