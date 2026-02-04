<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
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
    ViewPlugin,
    type DecorationSet,
    type ViewUpdate
  } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'
  import { foldedRanges } from '@codemirror/language'
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
    activePath = null
  } = $props<{
    root?: SusyNode | null
    indexer?: string
    filterKeys?: string
    activePath?: number[] | null
  }>()

  let host: HTMLDivElement
  let view: EditorView | null = null
  let spansByPath = $state<Map<string, Span>>(new Map())
  let teardownConfig: (() => void) | null = null
  const highlightCompartment = new Compartment()
  let blockHighlightEnabled = workspace
    .getConfiguration()
    .get('editor.blockSelectHighlight', true)

  const dispatch = createEventDispatcher<{ focusPath: number[] }>()

  const emptyMessage = '# Susy projection will appear here.'
  const emptySelectionMessage = '# Indexer did not match any value.'

  let yamlText = $state(emptyMessage)
  let lastActiveKey = $state<string | null>(null)

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

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: yamlText,
        extensions: [
          basicSetup,
          yaml(),
          oneDark,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          highlightCompartment.of(buildHighlightExtensions()),
          EditorView.domEventHandlers({
            // Sync focus path when YAML is clicked.
            mousedown: (event) => {
              if (!view) return false
              const coords = { x: event.clientX, y: event.clientY }
              const pos = view.posAtCoords(coords)
              if (pos == null) return false
              const path = findSusyYamlPathAtPos(spansByPath, pos)
              if (!path) return false
              dispatch('focusPath', path)
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
    teardownConfig = onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('editor.blockSelectHighlight')) return
      const next = workspace.getConfiguration().get('editor.blockSelectHighlight', true)
      if (next === blockHighlightEnabled) return
      blockHighlightEnabled = next
      syncHighlightMode()
    })
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
    syncHighlight()
  })

  // Tear down the editor view and listeners.
  onDestroy(() => {
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
