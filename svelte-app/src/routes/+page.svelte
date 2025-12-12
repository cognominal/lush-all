<script lang="ts">
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import YamlEditor from '$lib/components/YamlEditor.svelte'
  import { YAML_SAMPLE } from '$lib/logic/yamlSample'
  import {
    analyzeYaml,
    breadcrumbsAtOffset,
    type YamlAnalysis
  } from '$lib/logic/yamlAnalysis'

  let yamlText = YAML_SAMPLE
  let analysis: YamlAnalysis = analyzeYaml(yamlText)
  let cursorOffset = 0
  let hoverRange: { from: number; to: number } | null = null
  let editor: any = null

  let parseTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleParse(next: string) {
    yamlText = next
    if (parseTimer) clearTimeout(parseTimer)
    parseTimer = setTimeout(() => {
      analysis = analyzeYaml(yamlText)
    }, 150)
  }

  $: crumbs = breadcrumbsAtOffset(analysis, cursorOffset)
</script>

<div class="app">
  <div class="card">
    <div class="header">
      <div class="title">YAML_SAMPLE</div>
      <div class="hint">Move cursor to update breadcrumbs</div>
    </div>

    <YamlEditor
      bind:this={editor}
      value={yamlText}
      highlightRange={hoverRange}
      on:change={(e: CustomEvent<{ value: string }>) => scheduleParse(e.detail.value)}
      on:cursor={(e: CustomEvent<{ offset: number }>) => (cursorOffset = e.detail.offset)}
    />

    <BreadcrumbBar
      items={crumbs}
      on:hover={(e: CustomEvent<{ range: { from: number; to: number } | null }>) => (hoverRange = e.detail.range)}
      on:toggle={(e: CustomEvent<{ range: { from: number; to: number } | null }>) => editor?.toggleFold(e.detail.range)}
    />
  </div>

  {#if analysis.errors.length > 0}
    <div class="hint" style="color: rgba(248, 113, 113, 0.9);">
      {analysis.errors[0]}
    </div>
  {/if}
</div>
