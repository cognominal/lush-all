<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import { EditorState, StateEffect, StateField } from '@codemirror/state'
  import { Decoration, EditorView } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'

  export let value: string
  export let highlightRange: { from: number; to: number } | null = null

  const dispatch = createEventDispatcher<{
    change: { value: string }
    cursor: { offset: number }
  }>()

  let host: HTMLDivElement
  let view: EditorView | null = null

  const setHighlight = StateEffect.define<{ from: number; to: number } | null>()

  const highlightField = StateField.define({
    create() {
      return Decoration.none
    },
    update(deco, tr) {
      let next = deco.map(tr.changes)
      for (const e of tr.effects) {
        if (!e.is(setHighlight)) continue
        const range = e.value
        if (!range) next = Decoration.none
        else {
          const from = Math.max(0, Math.min(range.from, tr.state.doc.length))
          const to = Math.max(from, Math.min(range.to, tr.state.doc.length))
          next = Decoration.set([
            Decoration.mark({ class: 'cm-lush-highlight' }).range(from, to)
          ])
        }
      }
      return next
    },
    provide: (f) => EditorView.decorations.from(f)
  })

  function emitCursorOffset() {
    if (!view) return
    dispatch('cursor', { offset: view.state.selection.main.head })
  }

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        dispatch('change', { value: update.state.doc.toString() })
      }
      if (update.selectionSet) emitCursorOffset()
    })

    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          yaml(),
          oneDark,
          updateListener,
          highlightField,
          EditorView.theme({
            '.cm-lush-highlight': {
              background: 'rgba(96, 165, 250, 0.22)',
              borderRadius: '2px'
            }
          }),
          EditorView.theme({
            '&': { height: '420px' },
            '.cm-scroller': { overflow: 'auto' }
          })
        ]
      })
    })

    emitCursorOffset()
  })

  $: if (view) {
    const current = view.state.doc.toString()
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      })
    }
  }

  $: if (view) {
    view.dispatch({ effects: setHighlight.of(highlightRange) })
  }

  onDestroy(() => {
    view?.destroy()
    view = null
  })
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    border-bottom: 1px solid var(--border);
  }
</style>
