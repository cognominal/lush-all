<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import {
    EditorState,
    StateEffect,
    StateField,
    type Range,
    type StateEffect as StateEffectValue
  } from '@codemirror/state'
  import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'
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

  const dispatch = createEventDispatcher<{ focusPath: number[] }>()

  const emptyMessage = '# Susy projection will appear here.'
  const emptySelectionMessage = '# Indexer did not match any value.'

  let yamlText = $state(emptyMessage)
  let lastActiveKey = $state<string | null>(null)

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

  // Build highlight decorations for the active token path.
  function buildHighlightDecorations(): DecorationSet {
    if (!activePath) return Decoration.none
    const span = spansByPath.get(serializePath(activePath))
    if (!span) return Decoration.none
    const from = span.textFrom ?? span.from
    const to = span.textTo ?? span.to
    if (from >= to) return Decoration.none
    const ranges: Array<Range<Decoration>> = [
      Decoration.mark({ class: 'cm-susy-yaml-focus' }).range(from, to)
    ]
    return Decoration.set(ranges, true)
  }

  // Sync CodeMirror document and highlight state.
  function syncView(nextDoc: string) {
    if (!view) return
    const current = view.state.doc.toString()
    if (nextDoc === current) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextDoc },
      effects: [setDecorations.of(buildHighlightDecorations())]
    })
  }

  // Update highlight decorations after state changes.
  function syncHighlight(): void {
    if (!view) return
    const baseEffect = setDecorations.of(buildHighlightDecorations()) as StateEffectValue<unknown>
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
          decorationsField,
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
              padding: '16px'
            },
            '.cm-scroller': {
              overflow: 'auto'
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

  onDestroy(() => {
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
