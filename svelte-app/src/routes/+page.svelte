<script lang="ts">
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import JsStructurePane from '$lib/components/JsStructurePane.svelte'
  import TokenYamlPane from '$lib/components/TokenYamlPane.svelte'
  import YamlEditor from '$lib/components/YamlEditor.svelte'
  import { YAML_SAMPLE } from '$lib/logic/yamlSample'
  import {
    analyzeYaml,
    breadcrumbsAtOffset,
    selectedTokenInputAtOffset,
    tokenInputAsYaml,
    type YamlAnalysis
  } from '$lib/logic/yamlAnalysis'
  import { add_sequence_or_map } from '$lib/logic/inputHandling'

  let yamlText = YAML_SAMPLE
  let analysis: YamlAnalysis = analyzeYaml(yamlText)
  let cursorOffset = 0
  let hoverRange: { from: number; to: number } | null = null
  let foldToggleId = 0
  let foldToggleRequest: { range: { from: number; to: number } | null; id: number } | null =
    null

  let parseTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleParse(next: string) {
    yamlText = next
    if (parseTimer) clearTimeout(parseTimer)
    parseTimer = setTimeout(() => {
      analysis = analyzeYaml(yamlText)
    }, 150)
  }

  $: crumbs = breadcrumbsAtOffset(analysis, cursorOffset)
  $: paneOffset = hoverRange?.from ?? cursorOffset
  $: selectedTok = selectedTokenInputAtOffset(analysis, paneOffset)
  $: selectedTokYaml = tokenInputAsYaml(selectedTok)
</script>

<div class="app">
  <div class="card">
    <div class="header">
      <div class="title">YAML_SAMPLE</div>
      <div class="hint">Move cursor to update breadcrumbs</div>
    </div>

    <div class="split">
      <YamlEditor
        value={yamlText}
        highlightRange={hoverRange}
        {foldToggleRequest}
        onChange={(next) => scheduleParse(next)}
        onCursor={(offset) => (cursorOffset = offset)}
        onReturn={(docText, cursorOffset) => {
          const res = add_sequence_or_map(docText, cursorOffset)
          if (!res) return null
          return {
            from: res.changes.from,
            to: res.changes.to,
            insert: res.changes.insert,
            selectionOffset: res.selectionOffset
          }
        }}
      />

      <TokenYamlPane title="Selected Token (YAML)" yamlText={selectedTokYaml} />
    </div>

    <JsStructurePane value={analysis.jsView} />

    <BreadcrumbBar
      items={crumbs}
      onHover={(range) => (hoverRange = range)}
      onToggle={(range) => (foldToggleRequest = { range, id: ++foldToggleId })}
    />
  </div>

  {#if analysis.errors.length > 0}
    <div class="hint" style="color: rgba(248, 113, 113, 0.9);">
      {analysis.errors[0]}
    </div>
  {/if}
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: 1fr 360px;
    align-items: stretch;
  }

  @media (max-width: 900px) {
    .split {
      grid-template-columns: 1fr;
    }
  }
</style>
