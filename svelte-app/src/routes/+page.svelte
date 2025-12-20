<script lang="ts">
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import JsStructurePane from '$lib/components/JsStructurePane.svelte'
  import TokenYamlPane from '$lib/components/TokenYamlPane.svelte'
  import YamlEditor from '$lib/components/YamlEditor.svelte'
  import { SplitPane } from '@rich_harris/svelte-split-pane'
  import { YAML_SAMPLE } from '$lib/logic/yamlSample'
  import { yamlFileContent } from '$lib/logic/yamlFile'
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
  $: if ($yamlFileContent && $yamlFileContent !== yamlText) {
    scheduleParse($yamlFileContent)
  }
</script>

<div class="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6 text-surface-50">
  <div class="card flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex items-baseline justify-between gap-3 border-b border-surface-500/20 px-4 py-3">
      <div class="text-xs font-medium tracking-wide text-surface-200">YAML_SAMPLE</div>
      <div class="text-xs text-surface-300">Move cursor to update breadcrumbs</div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 flex-col gap-0 lg:hidden">
        <div class="min-h-0 flex-1">
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
        </div>

        <div class="min-h-0 flex-1">
          <TokenYamlPane title="Selected Token (YAML)" yamlText={selectedTokYaml} />
        </div>

        <div class="min-h-0 flex-1">
          <JsStructurePane value={analysis.jsView} />
        </div>

        <BreadcrumbBar
          items={crumbs}
          onHover={(range) => (hoverRange = range)}
          onToggle={(range) => (foldToggleRequest = { range, id: ++foldToggleId })}
        />
      </div>

      <div class="hidden min-h-0 flex-1 lg:block">
        <SplitPane
          type="vertical"
          id="main"
          min="240px"
          max="-240px"
          pos="-260px"
          --color="rgba(var(--color-surface-500) / 0.25)"
          --thickness="14px"
        >
          {#snippet a()}
            <div class="flex h-full min-h-0 flex-col">
              <div class="flex-1 min-h-0">
                <SplitPane
                  type="horizontal"
                  id="yaml"
                  min="160px"
                  max="-160px"
                  pos="-360px"
                  --color="rgba(var(--color-surface-500) / 0.25)"
                  --thickness="14px"
                >
                  {#snippet a()}
                    <div class="min-w-0">
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
                    </div>
                  {/snippet}

                  {#snippet b()}
                    <div class="min-w-0">
                      <TokenYamlPane title="Selected Token (YAML)" yamlText={selectedTokYaml} />
                    </div>
                  {/snippet}
                </SplitPane>
              </div>

              <BreadcrumbBar
                items={crumbs}
                onHover={(range) => (hoverRange = range)}
                onToggle={(range) => (foldToggleRequest = { range, id: ++foldToggleId })}
              />
            </div>
          {/snippet}

          {#snippet b()}
            <JsStructurePane value={analysis.jsView} />
          {/snippet}
        </SplitPane>
      </div>
    </div>
  </div>

  {#if analysis.errors.length > 0}
    <div class="text-xs text-error-400">
      {analysis.errors[0]}
    </div>
  {/if}
</div>

<style>
  :global([data-pane='yaml'] > svelte-split-pane-divider),
  :global([data-pane='main'] > svelte-split-pane-divider) {
    background-color: rgba(var(--color-tertiary-400) / 0.12);
    transition:
      background-color 120ms ease,
      filter 120ms ease;
  }

  :global([data-pane='yaml'] > svelte-split-pane-divider::after),
  :global([data-pane='main'] > svelte-split-pane-divider::after) {
    background-color: rgba(var(--color-tertiary-400) / 0.9);
    box-shadow: 0 0 0 1px rgba(var(--color-tertiary-400) / 0.35);
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  :global([data-pane='yaml'] > svelte-split-pane-divider::after) {
    width: 4px;
  }

  :global([data-pane='main'] > svelte-split-pane-divider::after) {
    height: 4px;
  }

  :global([data-pane='yaml'] > svelte-split-pane-divider:hover),
  :global([data-pane='main'] > svelte-split-pane-divider:hover) {
    background-color: rgba(var(--color-secondary-400) / 0.16);
    filter: drop-shadow(0 0 10px rgba(var(--color-secondary-400) / 0.25));
  }

  :global([data-pane='yaml'] > svelte-split-pane-divider:hover::after),
  :global([data-pane='main'] > svelte-split-pane-divider:hover::after) {
    background-color: rgba(var(--color-secondary-400) / 1);
    box-shadow:
      0 0 0 1px rgba(var(--color-secondary-300) / 0.6),
      0 0 18px rgba(var(--color-secondary-400) / 0.35);
  }
</style>
