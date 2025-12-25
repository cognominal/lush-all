<script lang="ts">
  type BreadcrumbItem = {
    type: string
    range: { from: number; to: number } | null
    value?: string
  }
  export let items: BreadcrumbItem[] = []

  export let onHover: ((range: { from: number; to: number } | null) => void) | undefined =
    undefined
  export let onToggle: ((range: { from: number; to: number } | null) => void) | undefined =
    undefined
  export let onSelect: ((value: string) => void) | undefined = undefined
</script>

<div
  class="flex flex-wrap items-center gap-1.5 border-t border-surface-500/20 px-3 py-2"
  aria-label="Breadcrumbs"
>
  {#if items.length === 0}
    <span class="text-xs text-surface-300">(no selection)</span>
  {:else}
    {#each items as item, i (i)}
      <button
        type="button"
        class="rounded-full border border-surface-500/25 bg-surface-500/10 px-2 py-0.5 font-mono text-xs text-surface-100/90"
        title={item.type}
        onmouseenter={() => onHover?.(item.range)}
        onmouseleave={() => onHover?.(null)}
        onclick={() => {
          if (onSelect) {
            onSelect(item.value ?? item.type)
          } else {
            onToggle?.(item.range)
          }
        }}
      >
        {item.type}
      </button>
      {#if i < items.length - 1}
        <span class="text-xs text-surface-500/60">/</span>
      {/if}
    {/each}
  {/if}
</div>
