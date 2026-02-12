<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte'
  import {
    Compartment,
    EditorState,
    StateEffect,
    StateField,
    type Extension,
    type StateEffectType
  } from '@codemirror/state'
  import {
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
    type DecorationSet,
    type ViewUpdate
  } from '@codemirror/view'
  import { foldedRanges } from '@codemirror/language'
  import {
    createHighlightRegistry,
    getNodeByPath,
    isSusyTok,
    parseHighlightYaml,
    serializePath,
    type HighlightMap,
    type SusyNode,
    type StructuralEditorState
  } from '@lush/structural'
  import highlightRaw from '@lush/structural/themes/default.yaml?raw'
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import HighlightEditor from '$lib/components/HighlightEditor.svelte'
  import { onDidChangeConfiguration, workspace } from '$lib/config/workspaceConfiguration'
  import {
    buildBreadcrumbs,
    clamp,
    createInitialState,
    findClosestPathAtPos,
    findPathAtPos,
    getSpan,
    getTextRange,
    handleKey,
    isMultilineRangeIgnoringEdgeBreaks,
    rebuildProjection,
    resolveInsertTarget,
    parsePathKey,
    setStateAndSync,
    syncView,
    type BreadcrumbItem
  } from '$lib/logic/structuralEditor'
  import {
    DEFAULT_LANGUAGE,
    DEFAULT_SAMPLE_OPTION,
    LANGUAGE_OPTIONS,
    SAMPLE_OPTIONS,
    STORAGE_KEY,
    findRuleprojSamplePath,
    findShortestSample,
    getProjectionForLanguage,
    normalizeLanguage,
    projectSource,
    readPersistedSelection,
    type ProjectionLanguage,
    sampleContent
  } from '$lib/logic/structuralEditorSamples'

  const { onFocusPath, onRootChange } = $props<{
    onFocusPath?: (path: number[]) => void
    onRootChange?: (root: SusyNode) => void
  }>()
  let activePath = $state<number[] | null>(null)

  let host: HTMLDivElement
  let view: EditorView | null = null
  let sourceHost: HTMLDivElement
  let sourceView: EditorView | null = null
  let tokPaths: number[][] = []
  let lastRoot: SusyNode | null = null
  let isMounted = $state(false)

  const highlightTheme = new Compartment()
  let highlightYamlText = $state(highlightRaw)
  const highlightMap = $derived(parseHighlightYaml(highlightYamlText))
  const highlightRegistry = $derived(createHighlightRegistry(highlightMap))
  const DEFAULT_THEME_NAME = 'default'
  let highlightThemeName = $state(DEFAULT_THEME_NAME)
  let highlightThemes = $state<string[]>([])
  let highlightKey = $state<string | null>(null)
  let highlightLine = $state('')
  let highlightPlaceholder = $state('No highlight match')
  let highlightError = $state<string | null>(null)
  let highlightSaving = $state(false)
  let highlightThemeTimer: ReturnType<typeof setTimeout> | null = null
  let teardownThemeEraseRefresh: (() => void) | null = null
  let teardownConfig: (() => void) | null = null
  let highlightEditorRef = $state<{ focus: () => void } | null>(null)
  let highlightRestoreToken = $state(0)
  let lastFocusKey: string | null = null
  let blockHighlightEnabled = workspace
    .getConfiguration()
    .get('editor.blockSelectHighlight', true)

  // List of supported highlight style tokens.
  const VALID_HIGHLIGHT_TOKENS = new Set([
    'bold',
    'italic',
    'underline',
    'blue',
    'red',
    'green',
    'yellow',
    'gray',
    'grey',
    'cyan',
    'magenta',
    'white',
    'black'
  ])

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

  const focusHighlightCompartment = new Compartment()
  const setFocusHighlightRange = StateEffect.define<{ from: number; to: number } | null>()
  const focusHighlightRangeField = StateField.define<{ from: number; to: number } | null>({
    // Track the focus highlight range in sync with document updates.
    create() {
      return null
    },
    // Update the tracked range after edits and explicit range effects.
    update(range, tr) {
      let next = range
      if (range) {
        next = {
          from: tr.changes.mapPos(range.from),
          to: tr.changes.mapPos(range.to)
        }
      }
      for (const effect of tr.effects) {
        if (!effect.is(setFocusHighlightRange)) continue
        const value = effect.value
        if (!value) {
          next = null
          continue
        }
        const from = Math.max(0, Math.min(value.from, tr.state.doc.length))
        const to = Math.max(from, Math.min(value.to, tr.state.doc.length))
        next = { from, to }
      }
      return next
    }
  })

  // Clamp a highlight range to valid document offsets.
  function clampHighlightRange(
    view: EditorView,
    range: { from: number; to: number }
  ): { from: number; to: number } {
    const docLength = view.state.doc.length
    const from = Math.max(0, Math.min(range.from, docLength))
    const to = Math.max(from, Math.min(range.to, docLength))
    return { from, to }
  }

  // Compute the multiline block-highlight range for the current focus.
  function getBlockFocusRange(state: StructuralEditorState): { from: number; to: number } | null {
    if (!blockHighlightEnabled || state.mode !== 'normal') return null
    const span = getSpan(state, state.currentPath)
    if (!span) return null
    const range = getTextRange(span)
    if (range.from >= range.to) return null
    if (!isMultilineRangeIgnoringEdgeBreaks(state.projectionText, range.from, range.to)) {
      return null
    }
    return range
  }

  // Fold block highlights to the visible section when folded lines are present.
  function resolveVisibleRange(
    view: EditorView,
    range: { from: number; to: number }
  ): { from: number; to: number } {
    const normalized = clampHighlightRange(view, range)
    let visibleTo = normalized.to
    foldedRanges(view.state).between(normalized.from, normalized.to, (from) => {
      if (from > normalized.from && from < visibleTo) {
        visibleTo = from
        return false
      }
    })
    return { from: normalized.from, to: visibleTo }
  }

  // Position the focus overlay rectangle over the highlighted block.
  function updateFocusHighlightOverlay(view: EditorView, overlay: HTMLDivElement): void {
    const range = view.state.field(focusHighlightRangeField, false)
    if (!range || range.from === range.to) {
      overlay.style.display = 'none'
      return
    }
    const visible = resolveVisibleRange(view, range)
    if (visible.from >= visible.to) {
      overlay.style.display = 'none'
      return
    }
    view.requestMeasure({
      read: () => {
        const fromCoords = view.coordsAtPos(visible.from)
        const toCoords = view.coordsAtPos(visible.to, -1)
        if (!fromCoords || !toCoords) return null
        const scrollRect = view.scrollDOM.getBoundingClientRect()
        const contentRect = view.contentDOM.getBoundingClientRect()
        return {
          top: Math.min(fromCoords.top, toCoords.top),
          bottom: Math.max(fromCoords.bottom, toCoords.bottom),
          left: contentRect.left - scrollRect.left + view.scrollDOM.scrollLeft,
          width: contentRect.width,
          scrollTop: view.scrollDOM.scrollTop,
          scrollTopRect: scrollRect.top
        }
      },
      write: (data) => {
        if (!data) {
          overlay.style.display = 'none'
          return
        }
        overlay.style.display = 'block'
        overlay.style.left = `${data.left}px`
        overlay.style.top = `${data.top - data.scrollTopRect + data.scrollTop}px`
        overlay.style.width = `${data.width}px`
        overlay.style.height = `${Math.max(0, data.bottom - data.top)}px`
      }
    })
  }

  const focusHighlightOverlay = ViewPlugin.fromClass(
    class {
      overlay: HTMLDivElement
      scrollRoot: HTMLElement
      onScroll: () => void

      // Create and attach the multiline focus highlight overlay.
      constructor(view: EditorView) {
        this.overlay = document.createElement('div')
        this.overlay.className = 'cm-structural-focus-block'
        this.scrollRoot = view.scrollDOM
        this.scrollRoot.appendChild(this.overlay)
        this.onScroll = () => updateFocusHighlightOverlay(view, this.overlay)
        this.scrollRoot.addEventListener('scroll', this.onScroll)
        updateFocusHighlightOverlay(view, this.overlay)
      }

      // Recompute overlay geometry when document or viewport state changes.
      update(update: ViewUpdate) {
        const rangeChanged =
          update.startState.field(focusHighlightRangeField, false) !==
          update.state.field(focusHighlightRangeField, false)
        if (update.docChanged || update.viewportChanged || update.geometryChanged || rangeChanged) {
          updateFocusHighlightOverlay(update.view, this.overlay)
        }
      }

      // Remove overlay DOM and listeners on teardown.
      destroy() {
        this.overlay.remove()
        this.scrollRoot.removeEventListener('scroll', this.onScroll)
      }
    }
  )

  // Build focus highlight extensions according to block highlight settings.
  function buildFocusHighlightExtensions(): Extension {
    return blockHighlightEnabled ? [focusHighlightRangeField, focusHighlightOverlay] : []
  }

  // Reconfigure focus highlight mode when block highlighting changes.
  function syncFocusHighlightMode(): void {
    if (!view) return
    view.dispatch({
      effects: focusHighlightCompartment.reconfigure(buildFocusHighlightExtensions())
    })
  }

  const initial = createInitialState(getProjectionForLanguage(DEFAULT_LANGUAGE).project(''))
  tokPaths = initial.tokPaths
  let editorState = $state<StructuralEditorState>(initial.state)
  let sourceError = $state<string | null>(null)
  let sourceText = $state('')
  let sourceLanguage = $state<ProjectionLanguage>(DEFAULT_LANGUAGE)
  let selectedSample = $state(DEFAULT_SAMPLE_OPTION)
  let ruleprojText = $state<string | null>(null)
  const FILTERED_SAMPLE_OPTIONS = $derived(
    SAMPLE_OPTIONS.filter(
      (option) => option.supported && option.language === sourceLanguage
    )
  )

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

  // Persist selection once the editor mounts.
  $effect(() => {
    if (!isMounted) return
    persistSelection()
  })

  // Keep the highlight input synced to the current token.
  $effect(() => {
    refreshHighlightForState(editorState)
  })

  // Reconfigure highlight theme when the yaml changes.
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


  $effect(() => {
    if (import.meta.env.DEV) {
      const target = window as Window & { __structuralEditorPropsActivePath?: number[] | null }
      target.__structuralEditorPropsActivePath = activePath
    }
  })


  $effect(() => {
    if (!import.meta.env.DEV) return
    const target = window as Window & { __structuralEditorActivePath?: number[] | null }
    target.__structuralEditorActivePath = activePath
  })

  // Emit updates whenever the root node changes.
  $effect(() => {
    if (editorState.root === lastRoot) return
    lastRoot = editorState.root
    onRootChange?.(editorState.root)
  })

  // Dispatch focus updates when the current token changes.
  $effect(() => {
    const nextKey = serializePath(editorState.currentTokPath)
    if (nextKey === lastFocusKey) return
    lastFocusKey = nextKey
    dispatchFocusPath(editorState)
  })

  // Dispatch focus updates when the current token changes.
  function dispatchFocusPath(next: StructuralEditorState): void {
    const nextPath = [...next.currentTokPath]
    if (import.meta.env.DEV) {
      const target = window as Window & {
        __structuralEditorDispatchedPath?: number[]
        __structuralEditorHasOnFocusPath?: boolean
      }
      target.__structuralEditorDispatchedPath = nextPath
      target.__structuralEditorHasOnFocusPath = Boolean(onFocusPath)
    }
    onFocusPath?.(nextPath)
  }

  // Apply an external focus request from the workspace.
  export function setActivePath(nextPath: number[] | null): void {
    if (!nextPath) return
    if (import.meta.env.DEV) {
      const target = window as Window & {
        __structuralEditorSetActivePathCalls?: number
        __structuralEditorAfterSetActivePathTokPath?: number[]
      }
      target.__structuralEditorSetActivePathCalls =
        (target.__structuralEditorSetActivePathCalls ?? 0) + 1
    }
    const nextActivePath = [...nextPath]
    const nextKey = serializePath(nextActivePath)
    const currentKey = serializePath(editorState.currentTokPath)
    if (currentKey === nextKey) return
    if (!getNodeByPath(editorState.root, nextActivePath)) return
    const span = getSpan(editorState, nextActivePath)
    const range = span ? getTextRange(span) : null
    const nextCursorOffset = editorState.mode === 'normal' ? range?.from ?? 0 : 0
    lastFocusKey = nextKey
    activePath = nextActivePath
    applyState(
      {
        ...editorState,
        currentPath: nextActivePath,
        currentTokPath: nextActivePath,
        cursorOffset: nextCursorOffset
      },
      false
    )
    if (import.meta.env.DEV) {
      const target = window as Window & {
        __structuralEditorAfterSetActivePathTokPath?: number[]
      }
      target.__structuralEditorAfterSetActivePathTokPath = editorState.currentTokPath
    }
  }

  // Sync state and view changes through shared logic.
  function applyState(next: StructuralEditorState, emitFocus = true) {
    const focusRange = getBlockFocusRange(next)
    const nextState = setStateAndSync(
      next,
      view,
      setDecorations,
      highlightRegistry,
      focusWidget,
      blockHighlightEnabled,
      setFocusHighlightRange,
      focusRange
    )
    const currentState = untrack(() => editorState)
    if (nextState !== currentState) {
      editorState = nextState
    }
    refreshHighlightForState(nextState)
    updateDebugState(nextState, tokPaths)
    if (emitFocus) dispatchFocusPath(nextState)
  }

  // Load the available highlight themes from the server.
  async function loadThemes() {
    try {
      const response = await fetch('/api/themes')
      if (!response.ok) return
      const data = (await response.json()) as { themes?: string[] }
      const themes = data.themes ?? []
      highlightThemes = themes
      const preferred = themes.includes(DEFAULT_THEME_NAME)
        ? DEFAULT_THEME_NAME
        : themes[0] ?? DEFAULT_THEME_NAME
      await loadTheme(preferred)
    } catch {
      // ignore theme load errors
    }
  }

  // Load a highlight theme YAML payload by name.
  async function loadTheme(themeName: string) {
    highlightThemeName = themeName
    try {
      const response = await fetch(
        `/api/themes?name=${encodeURIComponent(themeName)}`
      )
      if (!response.ok) return
      const data = (await response.json()) as { yaml?: string }
      if (typeof data.yaml === 'string') {
        highlightYamlText = data.yaml
        refreshHighlightForState(editorState)
        scheduleHighlightThemeRefresh()
      }
    } catch {
      // ignore theme load errors
    }
  }

  // Handle theme selection changes from the dropdown.
  function handleThemeChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement
    if (!select.value) return
    void loadTheme(select.value)
  }

  // Parse source and sync the structural editor tree.
  function applySource(source: string) {
    try {
      const nextRoot = projectSource(sourceLanguage, source, ruleprojText)
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

  // Update the parser when the language changes.
  function updateLanguage(nextLanguage: ProjectionLanguage) {
    sourceLanguage = nextLanguage
    sourceError = null
    const shortestSample = findShortestSample(
      SAMPLE_OPTIONS,
      sampleContent,
      nextLanguage
    )
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
    const nextState: StructuralEditorState = {
      ...editorState,
      currentPath: path,
      currentTokPath: inputPath,
      cursorOffset: nextOffset
    }
    editorState = nextState
    refreshHighlightForState(nextState)
    dispatchFocusPath(nextState)
  })

  // Update the structural editor when source edits occur.
  const sourceUpdateListener = EditorView.updateListener.of((update) => {
    if (!update.docChanged) return
    sourceText = update.state.doc.toString()
    applySource(sourceText)
  })

  // Initialize the editor view on mount.
  onMount(() => {
    void loadThemes()
    // Refresh theme data when user themes are erased from the command palette.
    const onThemesErased = () => {
      void loadThemes()
    }
    window.addEventListener('lush:themes-erased', onThemesErased as EventListener)
    teardownThemeEraseRefresh = () => {
      window.removeEventListener(
        'lush:themes-erased',
        onThemesErased as EventListener
      )
    }

    const persisted = readPersistedSelection()
    if (persisted) {
      sourceLanguage = normalizeLanguage(
        persisted.language,
        LANGUAGE_OPTIONS,
        DEFAULT_LANGUAGE
      )
      if (persisted.sample) {
        const sample = SAMPLE_OPTIONS.find((option) => option.value === persisted.sample)
        if (sample?.supported && sampleContent[persisted.sample]) {
          selectedSample = persisted.sample
          sourceText = sampleContent[persisted.sample]
        }
      }
    }

    if (!ruleprojText) {
      const ruleprojPath = findRuleprojSamplePath(SAMPLE_OPTIONS)
      if (ruleprojPath) {
        ruleprojText = sampleContent[ruleprojPath] ?? null
      }
    }

    if (!sourceText) {
      const fallback = findShortestSample(
        SAMPLE_OPTIONS,
        sampleContent,
        sourceLanguage
      )
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
          highlightTheme.of(EditorView.theme(highlightRegistry.themeSpec)),
          focusHighlightCompartment.of(buildFocusHighlightExtensions()),
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
              caretColor: 'rgba(56, 189, 248, 0.95)',
              position: 'relative',
              zIndex: 1
            },
            '.cm-scroller': {
              overflow: 'auto',
              position: 'relative'
            },
            '.cm-cursor': {
              borderLeftColor: 'rgba(56, 189, 248, 0.95)'
            },
            '.cm-structural-focus-block': {
              position: 'absolute',
              pointerEvents: 'none',
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              outline: '1px solid rgba(56, 189, 248, 0.7)',
              borderRadius: '3px',
              zIndex: 0
            },
            '.cm-structural-focus': {
              backgroundColor: 'transparent',
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
    teardownConfig = onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('editor.blockSelectHighlight')) return
      const next = workspace.getConfiguration().get('editor.blockSelectHighlight', true)
      if (next === blockHighlightEnabled) return
      blockHighlightEnabled = next
      syncFocusHighlightMode()
      syncView(
        view,
        editorState,
        setDecorations,
        highlightRegistry,
        focusWidget,
        blockHighlightEnabled,
        setFocusHighlightRange,
        getBlockFocusRange(editorState)
      )
    })

    syncView(
      view,
      editorState,
      setDecorations,
      highlightRegistry,
      focusWidget,
      blockHighlightEnabled,
      setFocusHighlightRange,
      getBlockFocusRange(editorState)
    )
    isMounted = true
    persistSelection()
    if (sourceText) applySource(sourceText)
  })

  // Tear down the editor view on destroy.
  onDestroy(() => {
    if (teardownThemeEraseRefresh) teardownThemeEraseRefresh()
    teardownConfig?.()
    teardownConfig = null
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

  // Apply breadcrumb selection by path and sync focus across panels.
  function handleBreadcrumbSelect(value: string): void {
    const nextPath = parsePathKey(value)
    if (!nextPath) return
    const nextKey = serializePath(nextPath)
    const currentKey = serializePath(editorState.currentPath)
    if (nextKey === currentKey) return
    if (!getNodeByPath(editorState.root, nextPath)) return
    const span = getSpan(editorState, nextPath)
    const range = span ? getTextRange(span) : null
    const nextCursorOffset =
      editorState.mode === 'normal' ? range?.from ?? editorState.cursorOffset : 0
    applyState({
      ...editorState,
      currentPath: nextPath,
      currentTokPath: nextPath,
      cursorOffset: nextCursorOffset
    })
  }

  $effect(() => {
    scheduleHighlightThemeRefresh()
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

  // Resolve the highlight key for the current node.
  // Resolve the highlight key for the current node.
  function resolveHighlightKey(
    map: HighlightMap,
    node: SusyNode | null | undefined
  ): string | null {
    if (!node) return null
    const kind = node.kind.toLowerCase()
    const type = node.type.toLowerCase()
    const exact = `${kind}.${type}`
    if (map.get(exact)?.trim()) return exact
    const kindOnly = `${kind}.*`
    if (map.get(kindOnly)?.trim()) return kindOnly
    const dotTypeOnly = `.${type}`
    if (map.get(dotTypeOnly)?.trim()) return dotTypeOnly
    const typeOnly = `*.${type}`
    if (map.get(typeOnly)?.trim()) return typeOnly
    if (map.get(exact) !== undefined) return exact
    if (map.get(kindOnly) !== undefined) return kindOnly
    if (map.get(dotTypeOnly) !== undefined) return dotTypeOnly
    if (map.get(typeOnly) !== undefined) return typeOnly
    return null
  }

  // Format a highlight line for display.
  // Format the highlight line for display.
  function formatHighlightLine(map: HighlightMap, key: string | null): string {
    if (!key) return ''
    if (!map.has(key)) return ''
    const value = map.get(key) ?? ''
    if (!value) return `${key}:`
    return `${key}: ${value}`
  }

  // Parse a highlight line into a key/value pair.
  // Parse a highlight line into a key/value pair.
  function parseHighlightLine(line: string): { key: string; value: string } | null {
    const trimmed = line.trim()
    if (!trimmed) return null
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) return null
    const key = trimmed.slice(0, colonIndex).trim().toLowerCase()
    const value = trimmed.slice(colonIndex + 1).trim()
    if (!key) return null
    return { key, value }
  }

  // Normalize equivalent wildcard kind keys (e.g. *.type and .type).
  function canonicalHighlightKey(key: string): string {
    const normalized = key.trim().toLowerCase()
    if (normalized.startsWith('*.')) return `.${normalized.slice(2)}`
    return normalized
  }

  // Check whether a highlight selector key applies to a token.
  function keyMatchesNode(key: string, node: SusyNode): boolean {
    const normalized = canonicalHighlightKey(key)
    const kind = node.kind.toLowerCase()
    const type = node.type.toLowerCase()
    if (normalized === `${kind}.${type}`) return true
    if (normalized === `${kind}.*`) return true
    if (normalized === `.${type}`) return true
    return false
  }

  // Build exact and wildcard key suggestions for a token.
  function suggestedKeysForNode(
    node: SusyNode | null | undefined
  ): { exact: string; wildcard: string } | null {
    if (!node) return null
    const kind = node.kind.toLowerCase()
    const type = node.type.toLowerCase()
    return { exact: `${kind}.${type}`, wildcard: `*.${type}` }
  }

  // Validate a style chain against known highlight tokens.
  function isValidHighlightStyle(value: string): boolean {
    const rawParts = value.split('.')
    if (rawParts.some((part) => part.trim() === '')) return false
    const parts = rawParts.map((part) => part.trim().toLowerCase())
    if (parts.length === 0) return false
    return parts.every((part) => VALID_HIGHLIGHT_TOKENS.has(part))
  }

  // Serialize highlight entries with alphabetized keys.
  // Serialize highlight entries with alphabetized keys.
  function serializeHighlightYaml(map: HighlightMap): string {
    const entries = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    if (entries.length === 0) return ''
    return `${entries
      .map(([key, value]) => `${key}: ${value === '' ? "''" : value}`)
      .join('\n')}\n`
  }

  // Sync the highlight line with the selected token.
  function syncHighlightLine(nextLine: string) {
    highlightLine = nextLine
    highlightError = null
  }

  // Refresh highlight state for the provided editor snapshot.
  // Refresh highlight state for the provided editor snapshot.
  function refreshHighlightForState(nextState: StructuralEditorState) {
    const node = getNodeByPath(nextState.root, nextState.currentTokPath)
    const nextKey = resolveHighlightKey(highlightMap, node)
    highlightKey = nextKey
    const suggested = suggestedKeysForNode(node)
    highlightPlaceholder = nextKey
      ? 'No highlight match'
      : suggested
        ? `${suggested.exact}:`
        : 'No highlight match'
    syncHighlightLine(formatHighlightLine(highlightMap, nextKey))
  }

  // Debounce highlight theme updates to avoid input jank.
  function scheduleHighlightThemeRefresh() {
    if (!view) return
    if (highlightThemeTimer) {
      clearTimeout(highlightThemeTimer)
      highlightThemeTimer = null
    }
    highlightThemeTimer = setTimeout(() => {
      highlightThemeTimer = null
      view?.dispatch({
        effects: highlightTheme.reconfigure(
          EditorView.theme(highlightRegistry.themeSpec)
        )
      })
      if (!view) return
      syncView(
        view,
        editorState,
        setDecorations,
        highlightRegistry,
        focusWidget,
        blockHighlightEnabled,
        setFocusHighlightRange,
        getBlockFocusRange(editorState)
      )
      updateDebugState(editorState, tokPaths)
    }, 120)
  }

  // Persist the updated highlight line to disk.
  // Persist the updated highlight line to disk.
  // Persist the updated highlight line to disk.
  async function saveHighlightLine(nextLine: string) {
    highlightError = null
    const update = parseHighlightLine(nextLine)
    if (!update) {
      highlightError = 'Enter a highlight entry like "kind.type: style".'
      return
    }
    const selectedNode = getNodeByPath(editorState.root, editorState.currentTokPath)
    if (!selectedNode || !keyMatchesNode(update.key, selectedNode)) {
      highlightError = 'Highlight key must match the selected token.'
      return
    }
    const suggestions = suggestedKeysForNode(selectedNode)
    if (!suggestions) {
      highlightError = 'No selected token for highlight update.'
      return
    }
    if (update.value && !isValidHighlightStyle(update.value)) {
      highlightError = 'Style must use known tokens like "blue.bold.underline".'
      return
    }
    const nextMap = new Map(highlightMap)
    let persistedKey = canonicalHighlightKey(update.key)
    if (persistedKey.startsWith('.')) {
      nextMap.delete(`*.${persistedKey.slice(1)}`)
    } else if (persistedKey.startsWith('*.')) {
      nextMap.delete(`.${persistedKey.slice(2)}`)
      persistedKey = canonicalHighlightKey(persistedKey)
    }
    const isSecondEnterCycle =
      update.value === '' &&
      canonicalHighlightKey(update.key) === canonicalHighlightKey(suggestions.exact) &&
      highlightKey !== null &&
      canonicalHighlightKey(highlightKey) === canonicalHighlightKey(suggestions.exact) &&
      (highlightMap.get(highlightKey) ?? '') === ''
    let persistedValue = update.value
    if (isSecondEnterCycle) {
      nextMap.delete(suggestions.exact)
      persistedKey = suggestions.wildcard
      persistedValue = ''
    }
    persistedKey = canonicalHighlightKey(persistedKey)
    if (persistedKey.startsWith('.')) {
      nextMap.delete(`*.${persistedKey.slice(1)}`)
    }
    // Let non-empty wildcard styles take effect by clearing an empty exact blocker.
    if (
      persistedValue !== '' &&
      canonicalHighlightKey(persistedKey) ===
        canonicalHighlightKey(suggestions.wildcard)
    ) {
      const exactKey = canonicalHighlightKey(suggestions.exact)
      if ((nextMap.get(exactKey) ?? '') === '') {
        nextMap.delete(exactKey)
      }
    }
    nextMap.set(persistedKey, persistedValue)
    const nextYaml = serializeHighlightYaml(nextMap)
    highlightSaving = true
    try {
      const response = await fetch('/api/highlight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: persistedKey,
          value: persistedValue,
          theme: highlightThemeName
        })
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to save highlight.')
      }
      highlightYamlText = nextYaml
      syncHighlightLine(formatHighlightLine(nextMap, persistedKey))
      scheduleHighlightThemeRefresh()
      highlightRestoreToken += 1
    } catch (error) {
      highlightError =
        error instanceof Error ? error.message : 'Failed to save highlight.'
    } finally {
      highlightSaving = false
    }
  }

  // Handle highlight editor commits.
  function handleHighlightCommit(nextLine: string) {
    void saveHighlightLine(nextLine)
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
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">
      Highlight
    </div>
    <div class="flex items-start gap-3">
      <label class="text-xs uppercase tracking-[0.25em] text-surface-400">
        <span class="sr-only">Theme</span>
        <select
          class="rounded-md border border-surface-700/70 bg-surface-900/70 px-2 py-1 text-xs text-surface-100"
          onchange={handleThemeChange}
          value={highlightThemeName}
        >
          {#if highlightThemes.length === 0}
            <option value={highlightThemeName}>{highlightThemeName}</option>
          {/if}
          {#each highlightThemes as theme}
            <option value={theme}>{theme}</option>
          {/each}
        </select>
      </label>
      <div class="flex-1">
        <HighlightEditor
          bind:this={highlightEditorRef}
          value={highlightLine}
          placeholder={highlightPlaceholder}
          saving={highlightSaving}
          error={highlightError}
          restoreToken={highlightRestoreToken}
          onCommit={handleHighlightCommit}
        />
      </div>
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
            {#each FILTERED_SAMPLE_OPTIONS as option}
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

  <BreadcrumbBar items={crumbs} onSelect={handleBreadcrumbSelect} />

  <div class="text-xs text-surface-400">
    Normal mode keys: i, Tab, Shift+Tab, Enter. Insert mode: Esc, printable
    characters.
  </div>
</div>
