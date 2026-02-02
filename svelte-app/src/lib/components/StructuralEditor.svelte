<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import {
    EditorState,
    StateEffect,
    StateField,
    type StateEffectType
  } from '@codemirror/state'
  import {
    Decoration,
    EditorView,
    WidgetType,
    type DecorationSet
  } from '@codemirror/view'
  import {
    createHighlightRegistry,
    getNodeByPath,
    isSusyTok,
    parseHighlightYaml,
    serializePath,
    type SusyNode,
    type StructuralEditorState
  } from '@lush/structural'
  import {
    susyJsProjection,
    susySvelteProjection,
    susyTsProjection,
    susyYamlProjection
  } from 'lush-types'
  import highlightRaw from '@lush/structural/highlight.yaml?raw'
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import {
    buildBreadcrumbs,
    clamp,
    createInitialState,
    findPathAtPos,
    getSpan,
    getTextRange,
    handleKey,
    rebuildProjection,
    resolveInsertTarget,
    setStateAndSync,
    syncView,
    type BreadcrumbItem
  } from '$lib/logic/structuralEditor'

  type SourceLanguage = 'svelte' | 'js' | 'ts' | 'yaml'

  const LANGUAGE_LABELS: Record<SourceLanguage, string> = {
    svelte: 'Svelte',
    js: 'JavaScript',
    ts: 'TypeScript',
    yaml: 'YAML'
  }

  const DEFAULT_SAMPLE_OPTION = ''
  const STORAGE_KEY = 'lush.editor.selection'

  type SampleOption = {
    label: string
    value: string
    language: SourceLanguage
  }

  const sampleContent = import.meta.glob<string>('../samples/*.{svelte,js,ts,yaml}', {
    eager: true,
    query: '?raw',
    import: 'default'
  })

  // Map file extensions to the source language.
  function getSampleLanguage(path: string): SourceLanguage {
    if (path.endsWith('.ts')) return 'ts'
    if (path.endsWith('.js')) return 'js'
    if (path.endsWith('.yaml')) return 'yaml'
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

  const { activePath = null } = $props<{
    activePath?: number[] | null
  }>()

  let host: HTMLDivElement
  let view: EditorView | null = null
  let sourceHost: HTMLDivElement
  let sourceView: EditorView | null = null
  let tokPaths: number[][] = []
  let lastRoot: SusyNode | null = null
  let isMounted = $state(false)

  const dispatch = createEventDispatcher<{
    rootChange: SusyNode
    focusPath: number[]
  }>()

  const highlightRegistry = createHighlightRegistry(parseHighlightYaml(highlightRaw))

  class FocusWidget extends WidgetType {
    // Render a placeholder span when focus would be empty.
    toDOM() {
      const span = document.createElement('span')
      span.className = 'cm-structural-empty'
      span.textContent = ' '
      return span
    }

    // Prevent editor events from reaching the widget.
    ignoreEvent() {
      return true
    }
  }

  const focusWidget = new FocusWidget()

  const setDecorations: StateEffectType<DecorationSet> =
    StateEffect.define<DecorationSet>()
  const decorationsField = StateField.define<DecorationSet>({
    // Seed decorations with an empty set.
    create() {
      return Decoration.none
    },
    // Replace decorations when an effect provides a new set.
    update(deco, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setDecorations)) return effect.value
      }
      return deco.map(tr.changes)
    },
    // Expose the decorations to CodeMirror view.
    provide: (field) => EditorView.decorations.from(field)
  })

  const initial = createInitialState()
  tokPaths = initial.tokPaths
  let editorState = $state<StructuralEditorState>(initial.state)
  let sourceError = $state<string | null>(null)
  let sourceText = $state(initial.state.projectionText)
  let sourceLanguage = $state<SourceLanguage>('svelte')
  let selectedSample = $state(DEFAULT_SAMPLE_OPTION)

  const filteredSamples = $derived(
    SAMPLE_OPTIONS.filter((option) => option.language === sourceLanguage)
  )

  function persistSelection(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ language: sourceLanguage, sample: selectedSample })
      )
    } catch {
      // ignore storage errors
    }
  }

  $effect(() => {
    if (!isMounted) return
    persistSelection()
  })

  $effect(() => {
    if (!selectedSample) return
    if (filteredSamples.some((option) => option.value === selectedSample)) return
    selectedSample = DEFAULT_SAMPLE_OPTION
  })

  // Emit updates whenever the root node changes.
  $effect(() => {
    if (editorState.root === lastRoot) return
    lastRoot = editorState.root
    dispatch('rootChange', editorState.root)
  })

  // Dispatch focus updates when the current token changes.
  function dispatchFocusPath(next: StructuralEditorState): void {
    dispatch('focusPath', next.currentTokPath)
  }

  // Sync state and view changes through shared logic.
  function applyState(next: StructuralEditorState, emitFocus = true) {
    editorState = setStateAndSync(
      next,
      view,
      setDecorations as unknown as StateEffect<DecorationSet>,
      highlightRegistry,
      focusWidget
    )
    if (emitFocus) dispatchFocusPath(editorState)
  }

  // Parse source and sync the structural editor tree.
  function applySource(source: string) {
    try {
      const nextRoot =
        sourceLanguage === 'svelte'
          ? susySvelteProjection(source)
          : sourceLanguage === 'ts'
            ? susyTsProjection(source)
            : sourceLanguage === 'yaml'
              ? susyYamlProjection(source)
              : susyJsProjection(source)
      const baseState: StructuralEditorState = {
        ...editorState,
        mode: 'normal',
        currentPath: [],
        currentTokPath: [],
        cursorOffset: 0
      }
      const rebuilt = rebuildProjection(nextRoot, baseState)
      tokPaths = rebuilt.tokPaths
      sourceError = null
      applyState({
        ...rebuilt.state,
        currentPath: [],
        currentTokPath: tokPaths[0] ?? []
      })
    } catch (error) {
      sourceError =
        error instanceof Error
          ? error.message
          : `Invalid ${LANGUAGE_LABELS[sourceLanguage]} source.`
    }
  }

  // Find the shortest sample for the selected language.
  function findShortestSample(language: SourceLanguage): SampleOption | null {
    let best: SampleOption | null = null
    let bestLength = Number.POSITIVE_INFINITY
    for (const option of SAMPLE_OPTIONS) {
      if (option.language !== language) continue
      const content = sampleContent[option.value] ?? ''
      if (content.length >= bestLength) continue
      best = option
      bestLength = content.length
    }
    return best
  }

  // Update the parser when the language changes.
  function updateLanguage(nextLanguage: SourceLanguage) {
    sourceLanguage = nextLanguage
    sourceError = null
    const shortestSample = findShortestSample(nextLanguage)
    if (shortestSample) {
      selectSample(shortestSample.value)
      return
    }
    selectedSample = DEFAULT_SAMPLE_OPTION
    sourceText = ''
    sourceView?.dispatch({
      changes: { from: 0, to: sourceView.state.doc.length, insert: '' }
    })
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
    sourceView?.dispatch({
      changes: { from: 0, to: sourceView.state.doc.length, insert: sourceText }
    })
    applySource(sourceText)
  }

  // Read persisted selection from local storage.
  function readPersistedSelection(): {
    language: SourceLanguage
    sample: string
  } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object') return null
      const record = parsed as { language?: string; sample?: string }
      const language = record.language
      const sample = record.sample
      if (
        language !== 'svelte' &&
        language !== 'js' &&
        language !== 'ts' &&
        language !== 'yaml'
      ) {
        return null
      }
      return {
        language,
        sample: typeof sample === 'string' ? sample : DEFAULT_SAMPLE_OPTION
      }
    } catch {
      return null
    }
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

  // Clamp selection updates to the current token span.
  const updateListener = EditorView.updateListener.of((update) => {
    if (!view) return
    if (!update.selectionSet) return

    if (editorState.mode === 'insert') {
      const span = getSpan(editorState, editorState.currentTokPath)
      const range = getTextRange(span)
      const head = update.state.selection.main.head
      const clamped = clamp(head, range.from, range.to)

      if (clamped !== head) {
        view.dispatch({ selection: { anchor: clamped } })
      } else {
        const nextOffset = clamped - range.from
        if (nextOffset !== editorState.cursorOffset) {
          editorState = { ...editorState, cursorOffset: nextOffset }
        }
      }
      return
    }

    if (editorState.mode === 'normal') {
      const span = getSpan(editorState, editorState.currentPath)
      if (!span) return
      const caret = span.textFrom ?? span.from
      const selection = update.state.selection.main
      if (selection.from !== caret || selection.to !== caret) {
        view.dispatch({ selection: { anchor: caret } })
      }
    }
  })

  // Update the structural editor when source edits occur.
  const sourceUpdateListener = EditorView.updateListener.of((update) => {
    if (!update.docChanged) return
    sourceText = update.state.doc.toString()
    applySource(sourceText)
  })

  // Initialize the editor view on mount.
  onMount(() => {
    const persisted = readPersistedSelection()
    if (persisted) {
      sourceLanguage = persisted.language
      if (persisted.sample && sampleContent[persisted.sample]) {
        selectedSample = persisted.sample
        sourceText = sampleContent[persisted.sample]
      }
    }

    if (!sourceText) {
      const fallback = findShortestSample(sourceLanguage)
      if (fallback) {
        selectedSample = fallback.value
        sourceText = sampleContent[fallback.value]
      }
    }
    sourceView = new EditorView({
      parent: sourceHost,
      state: EditorState.create({
        doc: sourceText,
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

    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: editorState.projectionText,
        extensions: [
          EditorState.allowMultipleSelections.of(false),
          EditorView.editable.of(true),
          EditorView.domEventHandlers({
            // Focus a token based on the click position.
            mousedown: (event) => {
              if (!view) return false
              if (editorState.mode !== 'normal') return false
              const coords = { x: event.clientX, y: event.clientY }
              const pos = view.posAtCoords(coords)
              if (pos == null) return false
              const path = findPathAtPos(editorState, pos)
              if (!path) return false
              const token = getNodeByPath(editorState.root, path)
              if (!token) return false
              const inputPath = isSusyTok(token)
                ? path
                : resolveInsertTarget(editorState.root, path).path
              applyState({
                ...editorState,
                currentPath: path,
                currentTokPath: inputPath
              })
              view.focus()
              return false
            },
            // Route keyboard input through structural editor logic.
            keydown: (event) => {
              const result = handleKey(event, editorState, tokPaths)
              if (result.handled) {
                event.preventDefault()
                tokPaths = result.tokPaths
                applyState(result.state)
              }
              return result.handled
            }
          }),
          updateListener,
          decorationsField,
          EditorView.theme(highlightRegistry.themeSpec),
          EditorView.theme({
            '&': {
              height: '100%',
              fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '14px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: 'rgb(226, 232, 240)'
            },
            '.cm-content': {
              padding: '16px',
              caretColor: 'rgba(56, 189, 248, 0.95)'
            },
            '.cm-scroller': {
              overflow: 'auto'
            },
            '.cm-cursor': {
              borderLeftColor: 'rgba(56, 189, 248, 0.95)'
            },
            '.cm-structural-focus': {
              backgroundColor: 'rgba(56, 189, 248, 0.18)',
              outline: '1px solid rgba(56, 189, 248, 0.6)',
              borderRadius: '3px'
            },
            '.cm-structural-empty': {
              display: 'inline-block',
              width: '0.6ch',
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              outline: '1px solid rgba(56, 189, 248, 0.6)',
              borderRadius: '3px'
            }
          })
        ]
      })
    })

    syncView(
      view,
      editorState,
      setDecorations as unknown as StateEffect<DecorationSet>,
      highlightRegistry,
      focusWidget
    )
    isMounted = true
    persistSelection()
    if (sourceText) applySource(sourceText)
  })

  // Tear down the editor view on destroy.
  onDestroy(() => {
    view?.destroy()
    view = null
    sourceView?.destroy()
    sourceView = null
  })

  let crumbs = $state<BreadcrumbItem[]>([])

  // Update breadcrumbs when the current path changes.
  $effect(() => {
    crumbs = buildBreadcrumbs(editorState, editorState.currentPath)
  })

  $effect(() => {
    if (!activePath) return
    const currentKey = serializePath(editorState.currentTokPath)
    const nextKey = serializePath(activePath)
    if (currentKey === nextKey) return
    if (!getNodeByPath(editorState.root, activePath)) return
    applyState(
      {
        ...editorState,
        currentPath: activePath,
        currentTokPath: activePath,
        cursorOffset: 0
      },
      false
    )
  })

  // Blur the editor when the mode badge is clicked.
  function blurOnClick() {
    view?.dom.blur()
  }

  // Blur the editor when the mode badge is activated by keyboard.
  function blurOnKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      view?.dom.blur()
    }
  }
</script>

<div class="flex h-full min-h-0 flex-col gap-4 p-6">
  <div class="flex items-baseline justify-between">
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">
      Structural Editor
    </div>
    <div
      class="text-xs text-surface-400"
      role="button"
      tabindex="0"
      onclick={blurOnClick}
      onkeydown={blurOnKeydown}
    >
      Mode: <span class="font-semibold text-surface-100">{editorState.mode}</span>
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
            value={sourceLanguage}
          >
            <option value="svelte">{LANGUAGE_LABELS.svelte}</option>
            <option value="js">{LANGUAGE_LABELS.js}</option>
            <option value="ts">{LANGUAGE_LABELS.ts}</option>
            <option value="yaml">{LANGUAGE_LABELS.yaml}</option>
          </select>
        </label>
        <label class="text-xs uppercase tracking-[0.2em] text-surface-400">
          <span class="sr-only">Sample</span>
          <select
            class="rounded-md border border-surface-700/70 bg-surface-900/70 px-2 py-1 text-xs text-surface-100"
            onchange={() => selectSample(selectedSample)}
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

  <div class="flex-1 min-h-0 rounded-xl border border-surface-700/60 bg-surface-900/70">
    <div class="h-full min-h-0" bind:this={host}></div>
  </div>

  <BreadcrumbBar items={crumbs} />

  <div class="text-xs text-surface-400">
    Normal mode keys: i, Tab, Shift+Tab, Enter. Insert mode: Esc, printable
    characters.
  </div>
</div>
