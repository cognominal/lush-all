<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { EditorState, StateEffect, StateField } from '@codemirror/state'
  import { Decoration, EditorView } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { yaml } from '@codemirror/lang-yaml'
  import { oneDark } from '@codemirror/theme-one-dark'
  import { codeFolding, foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language'
  import { keymap } from '@codemirror/view'

  export let value: string
  export let highlightRange: { from: number; to: number } | null = null
  export let foldToggleRequest:
    | { range: { from: number; to: number } | null; id: number }
    | null = null

  export let onChange: ((value: string) => void) | undefined = undefined
  export let onCursor: ((offset: number) => void) | undefined = undefined
  export let onReturn: ((docText: string, cursorOffset: number) => { from: number; to: number; insert: string; selectionOffset: number } | null) | undefined =
    undefined

  let host: HTMLDivElement
  let view: EditorView | null = null
  let lastFoldToggleId = -1

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
    onCursor?.(view.state.selection.main.head)
  }

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
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                if (!view) return true
                const offset = view.state.selection.main.head
                const docText = view.state.doc.toString()
                const res = onReturn?.(docText, offset)
                if (res) {
                  view.dispatch({
                    changes: { from: res.from, to: res.to, insert: res.insert },
                    selection: { anchor: res.selectionOffset }
                  })
                }
                return true
              }
            }
          ]),
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

  $: if (view && foldToggleRequest && foldToggleRequest.id !== lastFoldToggleId) {
    lastFoldToggleId = foldToggleRequest.id
    toggleFold(foldToggleRequest.range)
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
