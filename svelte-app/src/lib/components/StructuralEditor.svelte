<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import type { StructuralEditorState, SusyNode } from '@lush/structural'
  import {
    susyJsProjection,
    susySvelteProjection,
    susyTsProjection
  } from 'lush-types'
  import { SplitPane } from '@rich_harris/svelte-split-pane'
  import AcornYamlPanel from '$lib/components/AcornYamlPanel.svelte'
  import StructuralEditorTreePane from '$lib/components/StructuralEditorTreePane.svelte'

  type SourceLanguage = 'svelte' | 'js' | 'ts'

  const LANGUAGE_LABELS: Record<SourceLanguage, string> = {
    svelte: 'Svelte',
    js: 'JavaScript',
    ts: 'TypeScript'
  }

  const DEFAULT_SAMPLE_OPTION = ''

  type SampleOption = {
    label: string
    value: string
    language: SourceLanguage
  }

  const sampleContent = import.meta.glob<string>('../samples/*.{svelte,js,ts}', {
    eager: true,
    query: '?raw',
    import: 'default'
  })

  // Map file extensions to the source language.
  function getSampleLanguage(path: string): SourceLanguage {
    if (path.endsWith('.ts')) return 'ts'
    if (path.endsWith('.js')) return 'js'
    return 'svelte'
  }

  // Format a file path into a readable label.
  function formatSampleLabel(path: string): string {
    const name = path.split('/').pop() ?? path
    return `Sample: ${name.replace(/\.[^.]+$/, '')}`
  }

  // Build sample options from the discovered file list.
  function buildSampleOptions(): SampleOption[] {
    return Object.keys(sampleContent)
      .sort((a, b) => a.localeCompare(b))
      .map((path) => ({
        label: formatSampleLabel(path),
        value: path,
        language: getSampleLanguage(path)
      }))
  }

  const SAMPLE_OPTIONS = buildSampleOptions()

  const dispatch = createEventDispatcher<{ rootChange: SusyNode | null }>()

  let sourceHost: HTMLDivElement
  let sourceView: EditorView | null = null
  let lastRoot: SusyNode | null = null

  let sourceError = $state<string | null>(null)
  let sourceText = $state<string | null>(null)
  let sourceLanguage = $state<SourceLanguage>('svelte')
  let hasSelection = $state(false)
  let isParsing = $state(false)
  let selectedSample = $state(DEFAULT_SAMPLE_OPTION)
  let treeRoot = $state<SusyNode | null>(null)
  let editorMode = $state<StructuralEditorState['mode']>('normal')

  // Sync the selection state with the source text.
  $effect(() => {
    hasSelection = Boolean(sourceText?.trim())
  })

  // Parse or clear projections when the source changes.
  $effect(() => {
    if (!hasSelection) {
      applySource(null)
      return
    }
    if (sourceText === null) return
    applySource(sourceText)
  })

  // Emit root changes for the parent inspector.
  $effect(() => {
    if (treeRoot === lastRoot) return
    lastRoot = treeRoot
    dispatch('rootChange', treeRoot)
  })

  // Parse source and update the tree root.
  function applySource(source: string | null) {
    if (!source || !source.trim()) {
      sourceError = null
      treeRoot = null
      return
    }
    try {
      isParsing = true
      const nextRoot =
        sourceLanguage === 'svelte'
          ? susySvelteProjection(source)
          : sourceLanguage === 'ts'
            ? susyTsProjection(source)
            : susyJsProjection(source)
      treeRoot = nextRoot
      sourceError = null
    } catch (error) {
      treeRoot = null
      sourceError =
        error instanceof Error
          ? error.message
          : `Invalid ${LANGUAGE_LABELS[sourceLanguage]} source.`
    } finally {
      isParsing = false
    }
  }

  // Update the parser when the language changes.
  function updateLanguage(nextLanguage: SourceLanguage) {
    sourceLanguage = nextLanguage
    sourceText = null
    hasSelection = false
    selectedSample = DEFAULT_SAMPLE_OPTION
    sourceView?.dispatch({
      changes: { from: 0, to: sourceView.state.doc.length, insert: '' }
    })
    sourceError = null
    applySource(null)
  }

  // Load a bundled sample file into the editor.
  function loadSampleFile(path: string) {
    const sample = sampleContent[path]
    if (!sample) {
      sourceText = ''
      sourceError = 'Failed to load the selected sample.'
    } else {
      sourceText = sample
      sourceError = null
    }
    hasSelection = Boolean(sourceText?.trim())
    sourceView?.dispatch({
      changes: { from: 0, to: sourceView.state.doc.length, insert: sourceText ?? '' }
    })
  }

  // Select a sample and sync language state.
  function selectSample(value: string) {
    selectedSample = value
    if (!value) {
      selectedSample = DEFAULT_SAMPLE_OPTION
      return
    }
    const selection = SAMPLE_OPTIONS.find((option) => option.value === value)
    if (!selection) return
    sourceLanguage = selection.language
    sourceError = null
    loadSampleFile(selection.value)
  }

  const filteredSamples = $derived(
    SAMPLE_OPTIONS.filter((option) => option.language === sourceLanguage)
  )

  $effect(() => {
    if (!selectedSample) return
    if (filteredSamples.some((option) => option.value === selectedSample)) return
    selectedSample = DEFAULT_SAMPLE_OPTION
  })

  // Track root updates from the structural editor.
  function handleTreeRootChange(event: CustomEvent<SusyNode | null>) {
    treeRoot = event.detail
  }

  // Track mode updates from the structural editor.
  function handleModeChange(event: CustomEvent<StructuralEditorState['mode']>) {
    editorMode = event.detail
  }

  // Initialize the source editor view on mount.
  onMount(() => {
    // Track source editor edits.
    const sourceUpdateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      sourceText = update.state.doc.toString()
    })

    sourceView = new EditorView({
      parent: sourceHost,
      state: EditorState.create({
        doc: sourceText ?? '',
        extensions: [
          EditorState.allowMultipleSelections.of(false),
          EditorView.lineWrapping,
          sourceUpdateListener,
          EditorView.theme({
            '&': {
              height: '100%',
              fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '13px',
              backgroundColor: 'rgba(2, 6, 23, 0.7)',
              color: 'rgb(226, 232, 240)'
            },
            '.cm-content': {
              padding: '10px',
              caretColor: 'rgba(56, 189, 248, 0.95)'
            },
            '.cm-scroller': {
              overflow: 'auto'
            },
            '.cm-cursor': {
              borderLeftColor: 'rgba(56, 189, 248, 0.95)'
            }
          })
        ]
      })
    })
  })

  // Tear down the source editor view on destroy.
  onDestroy(() => {
    sourceView?.destroy()
    sourceView = null
  })
</script>

<div class="flex h-full min-h-0 flex-col gap-4 p-6">
  <div class="flex items-baseline justify-between">
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">
      Structural Editor
    </div>
    <div class="text-xs text-surface-400">
      Mode: <span class="font-semibold text-surface-100">{editorMode}</span>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="text-xs uppercase tracking-[0.35em] text-surface-400">
        Source
      </div>
      <div class="flex items-center gap-2 text-xs text-surface-300">
        <label class="text-xs uppercase tracking-[0.25em] text-surface-400">
          <span class="sr-only">Language</span>
          <select
            class="rounded-md border border-surface-700/70 bg-surface-900/70 px-2 py-1 text-xs text-surface-100"
            onchange={(event) =>
              updateLanguage((event.currentTarget as HTMLSelectElement).value as SourceLanguage)}
            disabled={isParsing}
            value={sourceLanguage}
          >
            <option value="svelte">{LANGUAGE_LABELS.svelte}</option>
            <option value="js">{LANGUAGE_LABELS.js}</option>
            <option value="ts">{LANGUAGE_LABELS.ts}</option>
          </select>
        </label>
        <label class="text-xs uppercase tracking-[0.2em] text-surface-400">
          <span class="sr-only">Sample</span>
          <select
            class="rounded-md border border-surface-700/70 bg-surface-900/70 px-2 py-1 text-xs text-surface-100"
            onchange={() => selectSample(selectedSample)}
            disabled={isParsing}
            bind:value={selectedSample}
          >
            <option value={DEFAULT_SAMPLE_OPTION}>
              Select {LANGUAGE_LABELS[sourceLanguage]} sample…
            </option>
            {#each filteredSamples as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
      </div>
    </div>
    <div
      class="h-[7rem] min-h-0 rounded-xl border border-surface-700/60 bg-surface-950/70"
    >
      <div class="h-full min-h-0" bind:this={sourceHost}></div>
    </div>
    {#if sourceError}
      <div class="text-xs text-amber-300">{sourceError}</div>
    {/if}
  </div>

  <div class="h-full min-h-0 flex-1">
    <SplitPane
      type="vertical"
      id="structural-panels"
      min="220px"
      max="-200px"
      pos="60%"
      --color="rgba(var(--color-surface-500) / 0.25)"
      --thickness="12px"
    >
      {#snippet a()}
        <div class="min-h-0">
          <StructuralEditorTreePane
            root={treeRoot}
            on:rootChange={handleTreeRootChange}
            on:modeChange={handleModeChange}
          />
        </div>
      {/snippet}

      {#snippet b()}
        <div class="min-h-0">
          <AcornYamlPanel sourceText={hasSelection ? sourceText : null} language={sourceLanguage} />
        </div>
      {/snippet}
    </SplitPane>
  </div>

  {#if !hasSelection}
    <div class="text-xs text-surface-400">
      No source loaded. Select a language and sample to begin.
    </div>
  {/if}
</div>

<style>
  :global([data-pane='structural-panels'] > svelte-split-pane-divider) {
    background-color: rgba(var(--color-tertiary-400) / 0.12);
    transition:
      background-color 120ms ease,
      filter 120ms ease;
  }

  :global([data-pane='structural-panels'] > svelte-split-pane-divider::after) {
    height: 4px;
    background-color: rgba(var(--color-tertiary-400) / 0.9);
    box-shadow: 0 0 0 1px rgba(var(--color-tertiary-400) / 0.35);
    transition:
      background-color 120ms ease,
      box-shadow 120ms ease;
  }

  :global([data-pane='structural-panels'] > svelte-split-pane-divider:hover) {
    background-color: rgba(var(--color-secondary-400) / 0.16);
    filter: drop-shadow(0 0 10px rgba(var(--color-secondary-400) / 0.25));
  }

  :global([data-pane='structural-panels'] > svelte-split-pane-divider:hover::after) {
    background-color: rgba(var(--color-secondary-400) / 1);
    box-shadow:
      0 0 0 1px rgba(var(--color-secondary-300) / 0.6),
      0 0 18px rgba(var(--color-secondary-400) / 0.35);
  }
</style>
