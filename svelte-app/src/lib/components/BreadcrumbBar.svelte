<script lang="ts">
  type BreadcrumbItem = { type: string; range: { from: number; to: number } | null }
  export let items: BreadcrumbItem[] = []

  export let onHover: ((range: { from: number; to: number } | null) => void) | undefined =
    undefined
  export let onToggle: ((range: { from: number; to: number } | null) => void) | undefined =
    undefined
</script>

<div class="bar" aria-label="Breadcrumbs">
  {#if items.length === 0}
    <span class="crumb muted">(no selection)</span>
  {:else}
    {#each items as item, i (i)}
      <button
        type="button"
        class="crumbBtn"
        title={item.type}
        onmouseenter={() => onHover?.(item.range)}
        onmouseleave={() => onHover?.(null)}
        onclick={() => onToggle?.(item.range)}
      >
        <code>{item.type}</code>
      </button>
      {#if i < items.length - 1}
        <span class="sep">/</span>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .bar {
    border-top: 1px solid var(--border);
    padding: 10px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .crumbBtn {
    all: unset;
    cursor: default;
  }

  .crumbBtn code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      'Liberation Mono', 'Courier New', monospace;
    font-size: 12px;
    color: rgba(226, 232, 240, 0.9);
    background: rgba(148, 163, 184, 0.08);
    border: 1px solid rgba(148, 163, 184, 0.16);
    padding: 2px 6px;
    border-radius: 999px;
  }

  .sep {
    color: rgba(226, 232, 240, 0.35);
    font-size: 12px;
  }

  .muted {
    color: var(--muted);
  }
</style>
