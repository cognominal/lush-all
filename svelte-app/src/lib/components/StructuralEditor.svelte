<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import {
    EditorSelection,
    EditorState,
    StateEffect,
    StateField,
    type Range
  } from '@codemirror/state'
  import {
    Decoration,
    EditorView,
    WidgetType,
    type DecorationSet
  } from '@codemirror/view'
  import {
    createHighlightRegistry,
    descendPath,
    findNextTokPath,
    findPrevTokPath,
    getNodeByPath,
    isSusyTok,
    parseHighlightYaml,
    serializePath,
    type SusyNode,
    type StructuralEditorState,
    type Span
  } from '@lush/structural'
  import highlightRaw from '@lush/structural/highlight.yaml?raw'
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte'
  import {
    buildBreadcrumbs,
    clamp,
    createInitialState,
    findPathAtPos,
    getTextRange,
    rebuildProjection,
    resolveInsertTarget,
    type BreadcrumbItem,
    updateTokenText
  } from '$lib/logic/structuralEditor'

  let host: HTMLDivElement
  let view: EditorView | null = null
  let tokPaths: number[][] = []
  let lastRoot: SusyNode | null = null

  const dispatch = createEventDispatcher<{ rootChange: SusyNode }>()

  const highlightRegistry = createHighlightRegistry(parseHighlightYaml(highlightRaw))

  class FocusWidget extends WidgetType {
    toDOM() {
      const span = document.createElement('span')
      span.className = 'cm-structural-empty'
      span.textContent = ' '
      return span
    }

    ignoreEvent() {
      return true
    }
  }

  const focusWidget = new FocusWidget()

  const setDecorations = StateEffect.define<DecorationSet>()
  const decorationsField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none
    },
    update(deco, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setDecorations)) return effect.value
      }
      return deco.map(tr.changes)
    },
    provide: (field) => EditorView.decorations.from(field)
  })

  const initial = createInitialState()
  tokPaths = initial.tokPaths
  let editorState = $state<StructuralEditorState>(initial.state)

  $effect(() => {
    if (editorState.root === lastRoot) return
    lastRoot = editorState.root
    dispatch('rootChange', editorState.root)
  })

  function getSpan(path: number[]): Span | undefined {
    return editorState.spansByPath.get(serializePath(path))
  }

  function buildSelection(): EditorSelection {
    if (editorState.mode === 'insert') {
      const span = getSpan(editorState.currentTokPath)
      const range = getTextRange(span)
      const caret = clamp(range.from + editorState.cursorOffset, range.from, range.to)
      return EditorSelection.single(caret)
    }

    const span = getSpan(editorState.currentPath)
    if (!span) return EditorSelection.single(0)
    const caret = span.textFrom ?? span.from
    return EditorSelection.single(caret)
  }

  function buildDecorations(): DecorationSet {
    const decorations: Array<Range<Decoration>> = []

    const visit = (token: SusyNode, path: number[]) => {
      const span = getSpan(path)
      if (span) {
        const className = highlightRegistry.classFor(token.kind, token.type)
        if (className && span.from < span.to) {
          decorations.push(Decoration.mark({ class: className }).range(span.from, span.to))
        }
      }
      token.kids?.forEach((child: SusyNode, idx: number) =>
        visit(child, [...path, idx])
      )
    }

    visit(editorState.root, [])

    if (editorState.mode === 'normal') {
      const focusSpan = getSpan(editorState.currentPath)
      if (focusSpan) {
        if (focusSpan.from === focusSpan.to) {
          decorations.push(
            Decoration.widget({ widget: focusWidget, side: 1 }).range(focusSpan.from)
          )
        } else {
          decorations.push(
            Decoration.mark({ class: 'cm-structural-focus' }).range(
              focusSpan.from,
              focusSpan.to
            )
          )
        }
      }
    }

    return Decoration.set(decorations, true)
  }

  function syncView() {
    if (!view) return
    const currentDoc = view.state.doc.toString()
    const effects = [setDecorations.of(buildDecorations())]
    const selection = buildSelection()
    const changes =
      currentDoc === editorState.projectionText
        ? undefined
        : { from: 0, to: view.state.doc.length, insert: editorState.projectionText }

    view.dispatch({ changes, selection, effects })
  }

  function setState(next: StructuralEditorState) {
    editorState = next
    syncView()
  }

  function enterInsertMode() {
    const target = resolveInsertTarget(editorState.root, editorState.currentPath)

    setState({
      ...editorState,
      mode: 'insert',
      currentPath: target.path,
      currentTokPath: target.path,
      cursorOffset: target.text.length
    })
  }

  function enterNormalMode() {
    setState({
      ...editorState,
      mode: 'normal',
      currentPath: editorState.currentTokPath
    })
  }

  function focusInputPath(path: number[]) {
    setState({
      ...editorState,
      currentPath: path,
      currentTokPath: path
    })
  }

  function descend() {
    const nextPath = descendPath(editorState.root, editorState.currentPath)
    if (serializePath(nextPath) === serializePath(editorState.currentPath)) return
    setState({
      ...editorState,
      currentPath: nextPath
    })
  }

  function moveToNextInput() {
    const nextPath = findNextTokPath(tokPaths, editorState.currentTokPath)
    if (!nextPath) return
    focusInputPath(nextPath)
  }

  function moveToPrevInput() {
    const prevPath = findPrevTokPath(tokPaths, editorState.currentTokPath)
    if (!prevPath) return
    focusInputPath(prevPath)
  }

  function insertChar(char: string) {
    const path = editorState.currentTokPath
    const token = getNodeByPath(editorState.root, path)
    if (!token) return
    const text = token.text ?? ''
    const offset = clamp(editorState.cursorOffset, 0, text.length)
    const nextText = text.slice(0, offset) + char + text.slice(offset)
    const nextRoot = updateTokenText(editorState.root, path, nextText)
    const baseState: StructuralEditorState = {
      ...editorState,
      mode: 'insert',
      currentPath: path,
      currentTokPath: path,
      cursorOffset: offset + char.length
    }
    const rebuilt = rebuildProjection(nextRoot, baseState)
    tokPaths = rebuilt.tokPaths
    setState(rebuilt.state)
  }

  function isPrintable(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return false
    if (event.key.length !== 1) return false
    return true
  }

  function handleKey(event: KeyboardEvent): boolean {
    if (editorState.mode === 'normal') {
      if (event.key === 'i' && !event.shiftKey) {
        enterInsertMode()
        return true
      }
      if (event.key === 'Enter' && event.shiftKey) {
        descend()
        return true
      }
      if (event.key === 'Enter') {
        descend()
        return true
      }
      if (event.key === 'Tab') {
        if (event.shiftKey) moveToPrevInput()
        else moveToNextInput()
        return true
      }
      if (event.key === 'Escape') return true
      return true
    }

    if (editorState.mode === 'insert') {
      if (event.key === 'Escape') {
        enterNormalMode()
        return true
      }
      if (event.key === 'Enter') return true
      if (isPrintable(event)) {
        insertChar(event.key)
        return true
      }
      return true
    }

    return false
  }

  const updateListener = EditorView.updateListener.of((update) => {
    if (!view) return
    if (!update.selectionSet) return

    if (editorState.mode === 'insert') {
      const span = getSpan(editorState.currentTokPath)
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
      const span = getSpan(editorState.currentPath)
      if (!span) return
      const caret = span.textFrom ?? span.from
      const selection = update.state.selection.main
      if (selection.from !== caret || selection.to !== caret) {
        view.dispatch({ selection: { anchor: caret } })
      }
    }
  })

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: editorState.projectionText,
        extensions: [
          EditorState.allowMultipleSelections.of(false),
          EditorView.editable.of(true),
          EditorView.domEventHandlers({
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
              setState({
                ...editorState,
                currentPath: path,
                currentTokPath: inputPath
              })
              view.focus()
              return false
            },
            keydown: (event) => {
              const handled = handleKey(event)
              if (handled) event.preventDefault()
              return handled
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

    syncView()
  })

  onDestroy(() => {
    view?.destroy()
    view = null
  })

  let crumbs = $state<BreadcrumbItem[]>([])

  $effect(() => {
    crumbs = buildBreadcrumbs(editorState, editorState.currentPath)
  })
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
      onclick={() => view?.dom.blur()}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          view?.dom.blur()
        }
      }}
    >
      Mode: <span class="font-semibold text-surface-100">{editorState.mode}</span>
    </div>
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
