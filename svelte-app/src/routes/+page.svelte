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

<div class="flex flex-col gap-4 text-surface-50">
  <div class="card">
    <div class="flex items-baseline justify-between gap-3 border-b border-surface-500/20 px-4 py-3">
      <div class="text-xs font-medium tracking-wide text-surface-200">YAML_SAMPLE</div>
      <div class="text-xs text-surface-300">Move cursor to update breadcrumbs</div>
    </div>

    <div class="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[1fr_360px]">
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
    <div class="text-xs text-error-400">
      {analysis.errors[0]}
    </div>
  {/if}
</div>
