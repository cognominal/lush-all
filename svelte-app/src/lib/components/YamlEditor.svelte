<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { Compartment, EditorState, StateEffect, StateField, type Extension } from '@codemirror/state'
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
  import { codeFolding, foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language'
  import { keymap } from '@codemirror/view'
  import { onDidChangeConfiguration, workspace } from '$lib/config/workspaceConfiguration'
  import { createPrefixKeyHandler } from '$lib/logic/keySequence'
  import type {
    YamlCommandId,
    YamlCommandResult
  } from '$lib/logic/yamlStructuralEditor'

  const {
    value,
    highlightRange = null,
    foldToggleRequest = null,
    onChange = undefined,
    onCursor = undefined,
    onCommand = undefined
  } = $props<{
    value: string
    highlightRange?: { from: number; to: number } | null
    foldToggleRequest?: { range: { from: number; to: number } | null; id: number } | null
    onChange?: (value: string) => void
    onCursor?: (offset: number) => void
    onCommand?: (
      command: YamlCommandId,
      ctx: { docText: string; selection: { from: number; to: number } }
    ) => YamlCommandResult | null
  }>()

  let host: HTMLDivElement
  let view: EditorView | null = null
  let lastFoldToggleId = -1
  let teardownConfig: (() => void) | null = null
  const prefixKeys = createPrefixKeyHandler<'bracket-left' | 'bracket-right'>(800)

  const setHighlight = StateEffect.define<{ from: number; to: number } | null>()
  const highlightCompartment = new Compartment()
  let blockHighlightEnabled = workspace
    .getConfiguration()
    .get('editor.blockSelectHighlight', true)

  const highlightRangeField = StateField.define<{ from: number; to: number } | null>({
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
      for (const e of tr.effects) {
        if (!e.is(setHighlight)) continue
        const value = e.value
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
      for (const e of tr.effects) {
        if (!e.is(setHighlight)) continue
        const range = e.value
        if (!range) {
          next = Decoration.none
          continue
        }
        const from = Math.max(0, Math.min(range.from, tr.state.doc.length))
        const to = Math.max(from, Math.min(range.to, tr.state.doc.length))
        next = Decoration.set([
          Decoration.mark({ class: 'cm-lush-highlight' }).range(from, to)
        ])
      }
      return next
    },
    // Expose mark decorations to the view layer.
    provide: (f) => EditorView.decorations.from(f)
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

  // Normalize the requested highlight range against the current document.
  function clampHighlightRange(
    view: EditorView,
    range: { from: number; to: number }
  ): { from: number; to: number } {
    const docLength = view.state.doc.length
    const from = Math.max(0, Math.min(range.from, docLength))
    const to = Math.max(from, Math.min(range.to, docLength))
    return { from, to }
  }

  // Collapse the highlight to the visible portion when the selection is folded.
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

  // Position the single overlay rectangle so it covers every highlighted line.
  function updateHighlightOverlay(
    view: EditorView,
    overlay: HTMLDivElement
  ): void {
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
        this.overlay.className = 'cm-lush-highlight-overlay'
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

  // Emit the current cursor position to consumers.
  function emitCursorOffset() {
    if (!view) return
    onCursor?.(view.state.selection.main.head)
  }

  // Dispatch a command result into the editor view.
  function applyCommandResult(result: YamlCommandResult): void {
    if (!view) return
    if (result.changes) {
      view.dispatch({
        changes: result.changes,
        selection: { anchor: result.selection.from, head: result.selection.to }
      })
      return
    }
    view.dispatch({
      selection: { anchor: result.selection.from, head: result.selection.to }
    })
  }

  // Run a structural command and apply its result if available.
  function runCommand(command: YamlCommandId): boolean {
    if (!view || !onCommand) return false
    const selection = view.state.selection.main
    const result = onCommand(command, {
      docText: view.state.doc.toString(),
      selection: { from: selection.from, to: selection.to }
    })
    if (!result) return false
    applyCommandResult(result)
    return true
  }

  // Build keymap handlers for YAML structural editing commands.
  function buildCommandKeymap() {
    return keymap.of([
      {
        key: 'Enter',
        run: () => runCommand('blockScalar') || runCommand('addItem')
      },
      {
        key: 'Space',
        run: () => runCommand('toggleInlineOrBlock')
      },
      {
        key: 'Tab',
        run: () => runCommand('nextField')
      },
      {
        key: 'Shift-Tab',
        run: () => runCommand('prevField')
      },
      {
        key: 'Backspace',
        run: () => runCommand('deleteSelection')
      },
      {
        key: 'Delete',
        run: () => runCommand('deleteSelection')
      },
      {
        key: 'Escape',
        run: () => runCommand('enlargeSelection')
      },
      {
        key: '[',
        run: () => {
          prefixKeys.setPrefix('bracket-left')
          return true
        }
      },
      {
        key: ']',
        run: () => {
          prefixKeys.setPrefix('bracket-right')
          return true
        }
      },
      {
        key: 'c',
        run: () => {
          return (
            prefixKeys.consume('bracket-left', () => runCommand('prevComment')) ||
            prefixKeys.consume('bracket-right', () => runCommand('nextComment'))
          )
        }
      }
    ])
  }

  // Initialize the CodeMirror editor instance and listeners.
  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange?.(update.state.doc.toString())
      }
      if (update.selectionSet) emitCursorOffset()
    })

    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          codeFolding(),
          yaml(),
          oneDark,
          buildCommandKeymap(),
          updateListener,
          highlightCompartment.of(buildHighlightExtensions()),
          EditorView.theme({
            '.cm-lush-highlight': {
              background: 'rgba(96, 165, 250, 0.22)',
              borderRadius: '2px'
            },
            '.cm-lush-highlight-overlay': {
              position: 'absolute',
              pointerEvents: 'none',
              background: 'rgba(96, 165, 250, 0.22)',
              borderRadius: '3px'
            }
          }),
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto', position: 'relative' }
          })
        ]
      })
    })

    emitCursorOffset()
    teardownConfig = onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('editor.blockSelectHighlight')) return
      const next = workspace.getConfiguration().get('editor.blockSelectHighlight', true)
      if (next === blockHighlightEnabled) return
      blockHighlightEnabled = next
      syncHighlightMode()
    })
  })

  $effect(() => {
    if (!view) return
    const current = view.state.doc.toString()
    if (value === current) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value }
    })
  })

  $effect(() => {
    if (!view) return
    view.dispatch({ effects: setHighlight.of(highlightRange) })
  })

  // Toggle the fold for the supplied range.
  function toggleFold(range: { from: number; to: number } | null) {
    if (!view || !range) return

    const fromLine = view.state.doc.lineAt(range.from)
    const toLine = view.state.doc.lineAt(range.to)
    if (toLine.number <= fromLine.number) return

    const foldRange = { from: fromLine.to, to: toLine.to }
    if (foldRange.to <= foldRange.from) return

    let exists = false
    foldedRanges(view.state).between(
      foldRange.from,
      foldRange.to,
      (from, to) => {
        if (from === foldRange.from && to === foldRange.to) {
          exists = true
          return false
        }
      }
    )

    view.dispatch({
      effects: (exists ? unfoldEffect : foldEffect).of(foldRange)
    })
  }

  $effect(() => {
    if (!view || !foldToggleRequest) return
    if (foldToggleRequest.id === lastFoldToggleId) return
    lastFoldToggleId = foldToggleRequest.id
    toggleFold(foldToggleRequest.range)
  })

  // Tear down the editor view and listeners.
  onDestroy(() => {
    teardownConfig?.()
    teardownConfig = null
    view?.destroy()
    view = null
  })
</script>

<div class="h-full" bind:this={host}></div>
