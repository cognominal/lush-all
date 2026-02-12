<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    Compartment,
    EditorState,
    StateEffect,
    StateField,
    type Extension,
    type StateEffect as StateEffectValue
  } from '@codemirror/state'
  import {
    Decoration,
    EditorView,
    GutterMarker,
    ViewPlugin,
    gutter,
    lineNumbers,
    type DecorationSet,
    type ViewUpdate
  } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'
  import {
    codeFolding,
    foldEffect,
    foldState,
    foldedRanges,
    unfoldEffect
  } from '@codemirror/language'
  import { onDidChangeConfiguration, workspace } from '$lib/config/workspaceConfiguration'
  import {
    findSusyYamlPathAtPos,
    projectSusyYamlView,
    type Span,
    type SusyNode
  } from 'lush-types'
  import { serializePath } from '@lush/structural'

  const {
    root = null,
    indexer = '',
    filterKeys = '',
    activePath = null,
    onFocusPath
  } = $props<{
    root?: SusyNode | null
    indexer?: string
    filterKeys?: string
    activePath?: number[] | null
    onFocusPath?: (path: number[]) => void
  }>()

  let host: HTMLDivElement
  let view: EditorView | null = null
  let spansByPath = $state<Map<string, Span>>(new Map())
  let teardownConfig: (() => void) | null = null
  const highlightCompartment = new Compartment()
  let blockHighlightEnabled = workspace
    .getConfiguration()
    .get('editor.blockSelectHighlight', true)

  const emptyMessage = '# Susy projection will appear here.'
  const emptySelectionMessage = '# Indexer did not match any value.'

  let yamlText = $state(emptyMessage)
  let lastActiveKey = $state<string | null>(null)
  let lastAutoFoldRange: { from: number; to: number } | null = null

  const setHighlightRange = StateEffect.define<{ from: number; to: number } | null>()
  const highlightRangeField = StateField.define<{ from: number; to: number } | null>({
    // Track the current highlight range within the editor state.
    create() {
      return null
    },
    update(range, tr) {
      let next = range
      if (range) {
        next = {
          from: tr.changes.mapPos(range.from),
          to: tr.changes.mapPos(range.to)
        }
      }
      for (const effect of tr.effects) {
        if (!effect.is(setHighlightRange)) continue
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

  const highlightDecorationsField = StateField.define<DecorationSet>({
    // Seed highlight decorations with an empty set.
    create() {
      return Decoration.none
    },
    // Update mark decorations from the highlight effect.
    update(deco, tr) {
      let next = deco.map(tr.changes)
      for (const effect of tr.effects) {
        if (!effect.is(setHighlightRange)) continue
        const range = effect.value
        if (!range) {
          next = Decoration.none
          continue
        }
        const from = Math.max(0, Math.min(range.from, tr.state.doc.length))
        const to = Math.max(from, Math.min(range.to, tr.state.doc.length))
        next = Decoration.set([
          Decoration.mark({ class: 'cm-susy-yaml-focus' }).range(from, to)
        ])
      }
      return next
    },
    // Expose mark decorations to the view layer.
    provide: (field) => EditorView.decorations.from(field)
  })

  // Choose the highlight extension set based on configuration.
  function buildHighlightExtensions(): Extension {
    return blockHighlightEnabled
      ? [highlightRangeField, highlightOverlay]
      : [highlightDecorationsField]
  }

  // Reconfigure the editor when highlight settings change.
  function syncHighlightMode(): void {
    if (!view) return
    view.dispatch({
      effects: highlightCompartment.reconfigure(buildHighlightExtensions())
    })
  }

  // Build the active highlight range for the current path.
  function getHighlightRange(): { from: number; to: number } | null {
    if (!activePath) return null
    const span = spansByPath.get(serializePath(activePath))
    if (!span) return null
    const from = span.textFrom ?? span.from
    const to = span.textTo ?? span.to
    if (from >= to) return null
    return { from, to }
  }

  // Clamp the incoming highlight range to the document bounds.
  function clampHighlightRange(
    view: EditorView,
    range: { from: number; to: number }
  ): { from: number; to: number } {
    const docLength = view.state.doc.length
    const from = Math.max(0, Math.min(range.from, docLength))
    const to = Math.max(from, Math.min(range.to, docLength))
    return { from, to }
  }

  // Collapse the highlight to the visible portion when folded.
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

  // Position the highlight overlay to cover every visible selected line.
  function updateHighlightOverlay(view: EditorView, overlay: HTMLDivElement): void {
    const range = view.state.field(highlightRangeField, false)
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

  const highlightOverlay = ViewPlugin.fromClass(
    class {
      overlay: HTMLDivElement
      scrollRoot: HTMLElement
      onScroll: () => void

      // Create and attach the highlight overlay element.
      constructor(view: EditorView) {
        this.overlay = document.createElement('div')
        this.overlay.className = 'cm-susy-yaml-focus-block'
        this.scrollRoot = view.scrollDOM
        this.scrollRoot.appendChild(this.overlay)
        this.onScroll = () => updateHighlightOverlay(view, this.overlay)
        this.scrollRoot.addEventListener('scroll', this.onScroll)
        updateHighlightOverlay(view, this.overlay)
      }

      // Recompute the overlay when the viewport or highlight range changes.
      update(update: ViewUpdate) {
        const rangeChanged =
          update.startState.field(highlightRangeField, false) !==
          update.state.field(highlightRangeField, false)
        if (update.docChanged || update.viewportChanged || update.geometryChanged || rangeChanged) {
          updateHighlightOverlay(update.view, this.overlay)
        }
      }

      // Clean up DOM and listeners on teardown.
      destroy() {
        this.overlay.remove()
        this.scrollRoot.removeEventListener('scroll', this.onScroll)
      }
    }
  )

  // Sync CodeMirror document and highlight state.
  function syncView(nextDoc: string) {
    if (!view) return
    const current = view.state.doc.toString()
    if (nextDoc === current) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextDoc },
      effects: [setHighlightRange.of(getHighlightRange())]
    })
  }

  // Update the highlight overlay after state changes.
  function syncHighlight(): void {
    if (!view) return
    const baseEffect = setHighlightRange.of(getHighlightRange()) as StateEffectValue<unknown>
    let effects: Array<StateEffectValue<unknown>> = [baseEffect]
    if (activePath) {
      const key = serializePath(activePath)
      const span = spansByPath.get(key)
      if (span && key !== lastActiveKey) {
        const from = span.textFrom ?? span.from
        effects = [...effects, EditorView.scrollIntoView(from, { y: 'center' })]
        lastActiveKey = key
      }
    }
    view.dispatch({ effects })
  }

  // Check whether a specific fold range is currently present.
  function hasFoldRange(nextView: EditorView, range: { from: number; to: number }): boolean {
    let exists = false
    foldedRanges(nextView.state).between(range.from, range.to, (from, to) => {
      if (from === range.from && to === range.to) {
        exists = true
        return false
      }
    })
    return exists
  }

  // Fold oversized selections so the focused block fits in the pane.
  function syncAutoFoldToPane(nextView: EditorView): void {
    const range = getHighlightRange()
    if (!range) {
      if (lastAutoFoldRange && hasFoldRange(nextView, lastAutoFoldRange)) {
        nextView.dispatch({ effects: unfoldEffect.of(lastAutoFoldRange) })
      }
      lastAutoFoldRange = null
      return
    }

    const fromLine = nextView.state.doc.lineAt(range.from)
    const toLine = nextView.state.doc.lineAt(range.to)
    const lineCount = toLine.number - fromLine.number + 1
    const lineHeight = nextView.defaultLineHeight || 1
    const visibleLineBudget = Math.max(1, Math.floor(nextView.scrollDOM.clientHeight / lineHeight))
    const shouldFold = lineCount > visibleLineBudget && toLine.number > fromLine.number
    const foldRange = { from: fromLine.to, to: toLine.to }

    if (
      lastAutoFoldRange &&
      (lastAutoFoldRange.from !== foldRange.from || lastAutoFoldRange.to !== foldRange.to) &&
      hasFoldRange(nextView, lastAutoFoldRange)
    ) {
      nextView.dispatch({ effects: unfoldEffect.of(lastAutoFoldRange) })
    }

    if (!shouldFold || foldRange.to <= foldRange.from) {
      lastAutoFoldRange = null
      return
    }

    if (!hasFoldRange(nextView, foldRange)) {
      nextView.dispatch({ effects: foldEffect.of(foldRange) })
    }
    lastAutoFoldRange = foldRange
  }

  // Resolve an indentation-based fold range for the line start.
  function getIndentFoldRange(
    state: EditorState,
    lineStart: number
  ): { from: number; to: number } | null {
    const line = state.doc.lineAt(lineStart)
    const lineText = line.text
    if (!lineText.trim()) return null
    const indentMatch = /^(\s*)/.exec(lineText)
    const baseIndent = indentMatch?.[1].length ?? 0
    let to: number | null = null
    for (let lineNo = line.number + 1; lineNo <= state.doc.lines; lineNo += 1) {
      const nextLine = state.doc.line(lineNo)
      const nextText = nextLine.text
      if (!nextText.trim()) continue
      const nextIndentMatch = /^(\s*)/.exec(nextText)
      const nextIndent = nextIndentMatch?.[1].length ?? 0
      if (nextIndent <= baseIndent) break
      to = nextLine.to
    }
    if (to === null || to <= line.to) return null
    return { from: line.to, to }
  }

  class SusyFoldMarker extends GutterMarker {
    open: boolean

    constructor(open: boolean) {
      super()
      this.open = open
    }

    // Keep marker instances reusable for identical states.
    eq(other: SusyFoldMarker): boolean {
      return this.open === other.open
    }

    // Render a CM-style fold marker glyph.
    toDOM(): HTMLElement {
      const span = document.createElement('span')
      span.textContent = this.open ? '⌄' : '›'
      return span
    }
  }

  const canFoldMarker = new SusyFoldMarker(true)
  const canUnfoldMarker = new SusyFoldMarker(false)

  // Find a folded range that starts at the given line boundary.
  function findFoldForLine(
    state: EditorState,
    lineStart: number
  ): { from: number; to: number } | null {
    const line = state.doc.lineAt(lineStart)
    let found: { from: number; to: number } | null = null
    foldedRanges(state).between(line.to, line.to + 1, (from, to) => {
      if (from === line.to) {
        found = { from, to }
        return false
      }
    })
    return found
  }

  // Build a dedicated fold gutter for Susy YAML panes.
  const susyFoldGutter = gutter({
    class: 'cm-foldGutter',
    // Recompute fold markers when document, viewport, or fold state changes.
    lineMarkerChange(update) {
      return (
        update.docChanged ||
        update.viewportChanged ||
        update.startState.field(foldState, false) !== update.state.field(foldState, false)
      )
    },
    // Show closed/open marker depending on current line fold state.
    lineMarker(view, line) {
      const folded = findFoldForLine(view.state, line.from)
      if (folded) return canUnfoldMarker
      const range = getIndentFoldRange(view.state, line.from)
      return range ? canFoldMarker : null
    },
    // Keep gutter width stable even when no visible foldable lines are in view.
    initialSpacer() {
      return canFoldMarker
    },
    // Toggle fold state when a fold marker line is clicked.
    domEventHandlers: {
      click(view, line) {
        const folded = findFoldForLine(view.state, line.from)
        if (folded) {
          view.dispatch({ effects: unfoldEffect.of(folded) })
          return true
        }
        const range = getIndentFoldRange(view.state, line.from)
        if (!range) return false
        view.dispatch({ effects: foldEffect.of(range) })
        return true
      }
    }
  })

  // Toggle folding for the currently highlighted block.
  function toggleActiveFold(nextView: EditorView): boolean {
    const range = getHighlightRange()
    if (!range) return false
    const fromLine = nextView.state.doc.lineAt(range.from)
    const toLine = nextView.state.doc.lineAt(range.to)
    if (toLine.number <= fromLine.number) return false
    const foldRange = { from: fromLine.to, to: toLine.to }
    if (foldRange.to <= foldRange.from) return false
    if (hasFoldRange(nextView, foldRange)) {
      nextView.dispatch({ effects: unfoldEffect.of(foldRange) })
      if (
        lastAutoFoldRange &&
        lastAutoFoldRange.from === foldRange.from &&
        lastAutoFoldRange.to === foldRange.to
      ) {
        lastAutoFoldRange = null
      }
      return true
    }
    nextView.dispatch({ effects: foldEffect.of(foldRange) })
    lastAutoFoldRange = foldRange
    return true
  }

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: yamlText,
        extensions: [
          basicSetup,
          lineNumbers(),
          codeFolding(),
          susyFoldGutter,
          yaml(),
          oneDark,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          highlightCompartment.of(buildHighlightExtensions()),
          EditorView.domEventHandlers({
            // Toggle folding when clicking in the left gutter margin.
            mousedown: (event) => {
              if (!view) return false
              const target = event.target as HTMLElement | null
              if (target?.closest('.cm-gutters')) {
                const handled = toggleActiveFold(view)
                if (handled) {
                  event.preventDefault()
                  return true
                }
              }
              return false
            },
            // Sync focus path when YAML is clicked.
            click: (event) => {
              if (!view) return false
              const target = event.target as HTMLElement | null
              if (target?.closest('.cm-gutters')) return false
              const coords = { x: event.clientX, y: event.clientY }
              const pos = view.posAtCoords(coords)
              if (pos == null) return false
              const path = findSusyYamlPathAtPos(spansByPath, pos)
              if (!path) return false
              const nextPath = [...path]
              onFocusPath?.(nextPath)
              return false
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '14px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)'
            },
            '.cm-content': {
              padding: '16px',
              position: 'relative',
              zIndex: 1
            },
            '.cm-scroller': {
              overflow: 'auto',
              position: 'relative'
            },
            '.cm-gutters': {
              backgroundColor: 'rgba(2, 6, 23, 0.9)',
              borderRight: '1px solid rgba(148, 163, 184, 0.25)',
              color: 'rgba(148, 163, 184, 0.9)'
            },
            '.cm-gutterElement': {
              padding: '0 8px'
            },
            '.cm-susy-yaml-focus-block': {
              position: 'absolute',
              pointerEvents: 'none',
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              outline: '1px solid rgba(56, 189, 248, 0.7)',
              borderRadius: '3px',
              zIndex: 0
            },
            '.cm-susy-yaml-focus': {
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              outline: '1px solid rgba(56, 189, 248, 0.7)',
              borderRadius: '3px'
            }
          })
        ]
      })
    })
    if (import.meta.env.DEV) {
      const target = window as Window & { __susyYamlView?: EditorView | null }
      target.__susyYamlView = view
    }
    teardownConfig = onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('editor.blockSelectHighlight')) return
      const next = workspace.getConfiguration().get('editor.blockSelectHighlight', true)
      if (next === blockHighlightEnabled) return
      blockHighlightEnabled = next
      syncHighlightMode()
    })
    syncAutoFoldToPane(view)
  })

  $effect(() => {
    if (!root) {
      yamlText = emptyMessage
      spansByPath = new Map()
      syncView(yamlText)
      return
    }

    const filterSet: Set<string> = new Set(filterKeys.split(/\s+/).filter(Boolean))
    const projection = projectSusyYamlView(root, { indexer, filterKeys: filterSet })
    if (!projection.text) {
      yamlText = emptySelectionMessage
      spansByPath = new Map()
      syncView(yamlText)
      return
    }
    yamlText = projection.text
    spansByPath = projection.spansByPath
    syncView(yamlText)
  })

  $effect(() => {
    activePath
    spansByPath
    syncHighlight()
    if (view) syncAutoFoldToPane(view)
  })

  // Tear down the editor view and listeners.
  onDestroy(() => {
    if (import.meta.env.DEV) {
      const target = window as Window & { __susyYamlView?: EditorView | null }
      target.__susyYamlView = null
    }
    teardownConfig?.()
    teardownConfig = null
    view?.destroy()
    view = null
  })
</script>

<div class="flex h-full min-h-0 flex-col gap-4 p-6">
  <div class="flex items-baseline justify-between">
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">
      Susy YAML
    </div>
    <div class="text-xs text-surface-400">
      Read-only
    </div>
  </div>

  <div class="flex-1 min-h-0 rounded-xl border border-surface-700/60 bg-surface-900/70">
    <div class="h-full min-h-0" bind:this={host}></div>
  </div>

  <div class="text-xs text-surface-400">
    Projection updates as you edit the structural tree.
  </div>
</div>
