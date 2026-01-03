<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import {
    EditorState,
    StateEffect,
    StateField
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
    type SusyNode,
    type StructuralEditorState
  } from '@lush/structural'
  import { susySvelteProjection } from 'lush-types'
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

  let host: HTMLDivElement
  let view: EditorView | null = null
  let sourceHost: HTMLDivElement
  let sourceView: EditorView | null = null
  let tokPaths: number[][] = []
  let lastRoot: SusyNode | null = null

  const dispatch = createEventDispatcher<{ rootChange: SusyNode }>()

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

  const setDecorations = StateEffect.define<DecorationSet>()
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

  // Emit updates whenever the root node changes.
  $effect(() => {
    if (editorState.root === lastRoot) return
    lastRoot = editorState.root
    dispatch('rootChange', editorState.root)
  })

  // Sync state and view changes through shared logic.
  function applyState(next: StructuralEditorState) {
    editorState = setStateAndSync(
      next,
      view,
      setDecorations,
      highlightRegistry,
      focusWidget
    )
  }

  // Parse Svelte source and sync the structural editor tree.
  function applySvelteSource(source: string) {
    try {
      const nextRoot = susySvelteProjection(source)
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
      sourceError = error instanceof Error ? error.message : 'Invalid Svelte source.'
    }
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
    applySvelteSource(sourceText)
  })

  // Initialize the editor view on mount.
  onMount(() => {
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

    syncView(view, editorState, setDecorations, highlightRegistry, focusWidget)
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
    <div class="text-xs uppercase tracking-[0.35em] text-surface-400">
      Svelte Source
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
