<script lang="ts">
  export let value: string = ''
  export let title: string = 'JS Structure (util.inspect)'
</script>

<div class="pane">
  <div class="paneHeader">{title}</div>
  <pre class="pre">{value}</pre>
</div>

<style>
  .pane {
    border-top: 1px solid var(--border);
    background: rgba(2, 6, 23, 0.28);
    display: grid;
    grid-template-rows: auto 1fr;
    height: 220px;
  }

  .paneHeader {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: var(--muted);
  }

  .pre {
    margin: 0;
    padding: 10px 12px;
    overflow: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      'Liberation Mono', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.45;
    color: rgba(226, 232, 240, 0.9);
    white-space: pre;
  }
</style>

