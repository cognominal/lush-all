<script lang="ts">
  import StructuralEditor from '$lib/components/StructuralEditor.svelte'
  import SusyYamlPanel from '$lib/components/SusyYamlPanel.svelte'
  import type { SusyNode } from 'lush-types'

  const DEFAULT_FILTER_KEYS = 'name_loc start end'

  let root = $state<SusyNode | null>(null)
  let indexer = $state('')
  let filterKeys = $state(DEFAULT_FILTER_KEYS)
  let activePath = $state<number[] | null>(null)
</script>

<div class="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
  <div class="min-h-0 flex-1">
    <StructuralEditor
      {activePath}
      on:rootChange={(event) => (root = event.detail)}
      on:focusPath={(event) => (activePath = event.detail)}
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
        on:focusPath={(event) => (activePath = event.detail)}
      />
    </div>
  </div>
</div>
