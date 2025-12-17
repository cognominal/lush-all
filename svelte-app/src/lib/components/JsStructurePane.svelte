<script lang="ts">
  export let value: string = ''
  export let title: string = 'JS Structure (util.inspect)'
</script>

<div class="grid h-[220px] grid-rows-[auto_1fr] border-t border-surface-500/20 bg-surface-900/25">
  <div class="border-b border-surface-500/20 px-3 py-2 text-xs text-surface-300">{title}</div>
  <pre
    class="m-0 overflow-auto whitespace-pre px-3 py-2 font-mono text-xs leading-relaxed text-surface-100/90"
  >
{value}
  </pre>
</div>
