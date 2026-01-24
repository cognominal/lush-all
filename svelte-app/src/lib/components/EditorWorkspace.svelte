<script lang="ts">
  import StructuralEditor from '$lib/components/StructuralEditor.svelte'
  import SusyYamlInspector from '$lib/components/SusyYamlInspector.svelte'
  import { SplitPane } from '@rich_harris/svelte-split-pane'
  import type { SusyNode } from 'lush-types'

  let root = $state<SusyNode | null>(null)
</script>

<div class="flex h-full min-h-0 flex-col gap-6 lg:hidden">
  <div class="min-h-0 flex-1">
    <StructuralEditor on:rootChange={(event) => (root = event.detail)} />
  </div>
  <div class="min-h-0 flex-1">
    <SusyYamlInspector {root} />
  </div>
</div>

<div class="hidden h-full min-h-0 lg:block">
  <SplitPane
    type="horizontal"
    id="editor-panels"
    min="320px"
    max="-320px"
    pos="50%"
    --color="rgba(var(--color-surface-500) / 0.25)"
    --thickness="14px"
  >
    {#snippet a()}
      <div class="min-w-0">
        <StructuralEditor on:rootChange={(event) => (root = event.detail)} />
      </div>
    {/snippet}

    {#snippet b()}
      <div class="min-w-0">
        <SusyYamlInspector {root} />
      </div>
    {/snippet}
  </SplitPane>
</div>

<style>
  :global([data-pane='editor-panels'] > svelte-split-pane-divider) {
    background-color: rgba(var(--color-tertiary-400) / 0.12);
    transition:
      background-color 120ms ease,
      filter 120ms ease;
  }

  :global([data-pane='editor-panels'] > svelte-split-pane-divider::after) {
    width: 4px;
    background-color: rgba(var(--color-tertiary-400) / 0.9);
    box-shadow: 0 0 0 1px rgba(var(--color-tertiary-400) / 0.35);
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  :global([data-pane='editor-panels'] > svelte-split-pane-divider:hover) {
    background-color: rgba(var(--color-secondary-400) / 0.16);
    filter: drop-shadow(0 0 10px rgba(var(--color-secondary-400) / 0.25));
  }

  :global([data-pane='editor-panels'] > svelte-split-pane-divider:hover::after) {
    background-color: rgba(var(--color-secondary-400) / 1);
    box-shadow:
      0 0 0 1px rgba(var(--color-secondary-300) / 0.6),
      0 0 18px rgba(var(--color-secondary-400) / 0.35);
  }
</style>
