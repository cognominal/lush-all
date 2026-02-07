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
    susyRuleprojProjection,
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
    findClosestPathAtPos,
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

  type ProjectionLanguage = 'svelte' | 'js' | 'ts' | 'yaml' | 'ruleproj'

  type ProjectionConfig = {
    language: ProjectionLanguage
    label: string
    project: (source: string) => SusyNode
  }

  const PROJECTION_BY_LANGUAGE: Record<ProjectionLanguage, ProjectionConfig> = {
    svelte: {
      language: 'svelte',
      label: 'Svelte',
      project: susySvelteProjection
    },
    js: {
      language: 'js',
      label: 'JavaScript',
      project: susyJsProjection
    },
    ts: {
      language: 'ts',
      label: 'TypeScript',
      project: susyTsProjection
    },
    yaml: {
      language: 'yaml',
      label: 'YAML',
      project: susyYamlProjection
    },
    ruleproj: {
      language: 'ruleproj',
      label: 'Ruleproj',
      project: susyRuleprojProjection
    }
  }

  const DEFAULT_SAMPLE_OPTION = ''
  const STORAGE_KEY = 'lush.editor.selection'

  type SampleOption = {
    label: string
    value: string
    extension: string
    language: ProjectionLanguage | null
    supported: boolean
  }

  type LanguageOption = {
    id: string
    label: string
    extension: string
    language: ProjectionLanguage | null
    supported: boolean
  }

  const sampleContent = import.meta.glob<string>(
    '../samples/*.{svelte,js,ts,yaml,ruleproj}',
    {
      eager: true,
      query: '?raw',
      import: 'default'
    }
  )

  // Read the file extension from a sample path.
  function getFileExtension(path: string): string {
    const name = path.split('/').pop() ?? path
    const parts = name.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  }

  // Resolve a projection config for a file extension.
  function getProjectionForExtension(extension: string): ProjectionConfig | null {
    const lookup = PROJECTION_BY_LANGUAGE as Record<string, ProjectionConfig | undefined>
    return lookup[extension] ?? null
  }

  // Resolve a projection config for a supported language.
  function getProjectionForLanguage(language: ProjectionLanguage): ProjectionConfig {
    return PROJECTION_BY_LANGUAGE[language]
  }

  // Format a file path into a readable label.
  function formatSampleLabel(path: string, extension: string): string {
    const name = path.split('/').pop() ?? path
    const stem = name.replace(/\.[^.]+$/, '')
    return `Sample: ${stem} (${extension})`
  }

  // Build sample options from the discovered file list.
  function buildSampleOptions(): SampleOption[] {
    return Object.keys(sampleContent)
      .sort((a, b) => a.localeCompare(b))
      .map((path) => {
        const extension = getFileExtension(path)
        const projection = getProjectionForExtension(extension)
        return {
          label: formatSampleLabel(path, extension || 'unknown'),
          value: path,
          extension,
          language: projection?.language ?? null,
          supported: Boolean(projection)
        }
      })
  }

  const SAMPLE_OPTIONS = buildSampleOptions()
  const LANGUAGE_OPTIONS = buildLanguageOptions(SAMPLE_OPTIONS)
  const DEFAULT_LANGUAGE = pickDefaultLanguage(LANGUAGE_OPTIONS, 'svelte')

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

  const initial = createInitialState(getProjectionForLanguage(DEFAULT_LANGUAGE).project(''))
  tokPaths = initial.tokPaths
  let editorState = $state<StructuralEditorState>(initial.state)
  let sourceError = $state<string | null>(null)
  let sourceText = $state('')
  let sourceLanguage = $state<ProjectionLanguage>(DEFAULT_LANGUAGE)
  let selectedSample = $state(DEFAULT_SAMPLE_OPTION)

  // Expose editor state for devtools debugging.
  function updateDebugState(next: StructuralEditorState, nextTokPaths: number[][]) {
    if (!import.meta.env.DEV) return
    const target = window as Window & {
      __structuralEditorState?: StructuralEditorState
      __structuralEditorTokPaths?: number[][]
    }
    target.__structuralEditorState = next
    target.__structuralEditorTokPaths = nextTokPaths
  }

  // Expose the CodeMirror view for devtools automation.
  function updateDebugView(nextView: EditorView | null) {
    if (!import.meta.env.DEV) return
    const target = window as Window & { __structuralEditorView?: EditorView | null }
    target.__structuralEditorView = nextView
  }

  // Expose debug helpers for driving key handling in tests.
  function updateDebugControls(nextView: EditorView | null) {
    if (!import.meta.env.DEV) return
    const target = window as Window & {
      __structuralEditorDebug?: {
        handleKey: (key: string) => void
        setCaret: (pos: number) => void
        getCaret: () => number
        getDoc: () => string
      }
    }
    target.__structuralEditorDebug = {
      handleKey: (key: string) => {
        const event = new KeyboardEvent('keydown', { key })
        const result = handleKey(event, editorState, tokPaths)
        if (result.handled) {
          tokPaths = result.tokPaths
          applyState(result.state)
        }
      },
      setCaret: (pos: number) => {
        if (!nextView) return
        nextView.dispatch({ selection: { anchor: pos } })
      },
      getCaret: () => nextView?.state.selection.main.head ?? 0,
      getDoc: () => nextView?.state.doc.toString() ?? ''
    }
  }

  // Build language options from sample extensions.
  function buildLanguageOptions(samples: SampleOption[]): LanguageOption[] {
    const seen = new Set<string>()
    const options: LanguageOption[] = []
    for (const sample of samples) {
      if (seen.has(sample.extension)) continue
      seen.add(sample.extension)
      const projection = getProjectionForExtension(sample.extension)
      if (projection) {
        options.push({
          id: projection.language,
          label: projection.label,
          extension: sample.extension,
          language: projection.language,
          supported: true
        })
      } else {
        const label = sample.extension ? sample.extension.toUpperCase() : 'Unknown'
        options.push({
          id: `ext:${sample.extension || 'unknown'}`,
          label,
          extension: sample.extension,
          language: null,
          supported: false
        })
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }

  // Pick the default language from the supported options.
  function pickDefaultLanguage(
    options: LanguageOption[],
    fallback: ProjectionLanguage
  ): ProjectionLanguage {
    const preferred = options.find(
      (option) => option.supported && option.language === fallback
    )
    if (preferred?.language) return preferred.language
    const supported = options.find(
      (option) => option.supported && option.language
    )
    return supported?.language ?? fallback
  }

  // Guard that a string is a supported projection language.
  function isProjectionLanguage(value: string): value is ProjectionLanguage {
    return value in PROJECTION_BY_LANGUAGE
  }

  // Normalize a language against the available sample extensions.
  function normalizeLanguage(language: ProjectionLanguage): ProjectionLanguage {
    const supported = LANGUAGE_OPTIONS.some(
      (option) => option.supported && option.language === language
    )
    return supported ? language : DEFAULT_LANGUAGE
  }

  // Handle language selector updates safely.
  function handleLanguageChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement
    const option = LANGUAGE_OPTIONS.find((item) => item.id === select.value)
    if (!option?.supported || !option.language) return
    updateLanguage(option.language)
  }

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
    updateDebugState(editorState, tokPaths)
    updateDebugControls(view)
  })

  $effect(() => {
    if (!selectedSample) return
    const match = SAMPLE_OPTIONS.find((option) => option.value === selectedSample)
    if (match?.supported) return
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
      setDecorations,
      highlightRegistry,
      focusWidget
    )
    updateDebugState(editorState, tokPaths)
    if (emitFocus) dispatchFocusPath(editorState)
  }

  // Parse source and sync the structural editor tree.
  function applySource(source: string) {
    try {
      const nextRoot = getProjectionForLanguage(sourceLanguage).project(source)
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
          : `Invalid ${getProjectionForLanguage(sourceLanguage).label} source.`
    }
  }

  // Find the shortest sample for the selected language.
  function findShortestSample(language: ProjectionLanguage): SampleOption | null {
    let best: SampleOption | null = null
    let bestLength = Number.POSITIVE_INFINITY
    for (const option of SAMPLE_OPTIONS) {
      if (!option.supported || option.language !== language) continue
      const content = sampleContent[option.value] ?? ''
      if (content.length >= bestLength) continue
      best = option
      bestLength = content.length
    }
    return best
  }

  // Update the parser when the language changes.
  function updateLanguage(nextLanguage: ProjectionLanguage) {
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
    language: ProjectionLanguage
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
      if (typeof language !== 'string' || !isProjectionLanguage(language)) {
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
    if (!selection || !selection.supported || !selection.language) return
    sourceLanguage = selection.language
    sourceError = null
    loadSampleFile(selection.value)
  }

  // Track selection updates and sync cursor/path state.
  const updateListener = EditorView.updateListener.of((update) => {
    if (!view) return
    if (!update.selectionSet) return

    const head = update.state.selection.main.head
    const path = findPathAtPos(editorState, head) ?? findClosestPathAtPos(editorState, head)
    if (!path) return
    const token = getNodeByPath(editorState.root, path)
    if (!token) return
    const inputPath = isSusyTok(token)
      ? path
      : resolveInsertTarget(editorState.root, path).path
    const span = getSpan(editorState, inputPath)
    if (!span) return
    const range = getTextRange(span)
    const nextOffset =
      editorState.mode === 'normal'
        ? head
        : clamp(head - range.from, 0, range.to - range.from)
    if (
      serializePath(editorState.currentPath) === serializePath(path) &&
      serializePath(editorState.currentTokPath) === serializePath(inputPath) &&
      editorState.cursorOffset === nextOffset
    ) {
      return
    }
    editorState = {
      ...editorState,
      currentPath: path,
      currentTokPath: inputPath,
      cursorOffset: nextOffset
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
      sourceLanguage = normalizeLanguage(persisted.language)
      if (persisted.sample) {
        const sample = SAMPLE_OPTIONS.find((option) => option.value === persisted.sample)
        if (sample?.supported && sampleContent[persisted.sample]) {
          selectedSample = persisted.sample
          sourceText = sampleContent[persisted.sample]
        }
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
    updateDebugView(view)

    syncView(
      view,
      editorState,
      setDecorations,
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
    updateDebugView(null)
    updateDebugControls(null)
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
            onchange={handleLanguageChange}
            value={sourceLanguage}
          >
            {#each LANGUAGE_OPTIONS as option}
              <option
                value={option.id}
                disabled={!option.supported}
                class={option.supported ? 'text-surface-100' : 'text-surface-500'}
              >
                {option.label}
              </option>
            {/each}
          </select>
        </label>
        <label class="text-xs uppercase tracking-[0.2em] text-surface-400">
          <span class="sr-only">Sample</span>
          <select
            class="rounded-md border border-surface-700/70 bg-surface-900/70 px-2 py-1 text-xs text-surface-100"
            onchange={(event) =>
              selectSample((event.currentTarget as HTMLSelectElement).value)}
            bind:value={selectedSample}
          >
            <option value={DEFAULT_SAMPLE_OPTION}>
              Select {getProjectionForLanguage(sourceLanguage).label} sample…
            </option>
            {#each SAMPLE_OPTIONS as option}
              <option
                value={option.value}
                disabled={!option.supported}
                class={option.supported ? 'text-surface-100' : 'text-surface-500'}
              >
                {option.label}
              </option>
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
