<script lang="ts">
  export let yamlText: string = ''
  export let title: string = 'Selected Token'
</script>

<div class="grid h-[420px] grid-rows-[auto_1fr] border-l border-surface-500/20 bg-surface-900/40">
  <div class="border-b border-surface-500/20 px-3 py-2 text-xs text-surface-300">{title}</div>
  <pre
    class="m-0 overflow-auto whitespace-pre px-3 py-3 font-mono text-xs leading-relaxed text-surface-100/90"
  >
{yamlText || '(no token selected)'}
  </pre>
</div>
