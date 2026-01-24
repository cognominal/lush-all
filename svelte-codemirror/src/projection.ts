import type { SusyNode } from '../../lush-types/index.ts'
import type { Span } from './types'
import { isSusyTok, serializePath } from './tree'

export interface ProjectionResult {
  text: string
  spansByPath: Map<string, Span>
  tokPaths: number[][]
}

type SubtreeProjection = {
  text: string
  spansByPath: Map<string, Span>
  tokPaths: number[][]
}

// Project a subtree into text, spans, and token paths.
//
//   projectSubtree recursively flattens a SusyNode subtree into a single string, while tracking where each node’s text lands in the flattened result. For leaf nodes
// it returns the token text and a span for the current path. For non-leaf nodes it projects each child, inserts spaces between child texts when needed, offsets
// child spans into the combined text, and aggregates all token paths. It also records a span for the current node covering the entire combined text.
//
// Key behaviors:
//
// - Leaf: uses token.text ?? '', span from 0..length, and includes path in tokPaths only if isSusyTok(token) is true.
// - Non-leaf: concatenates child projections with single spaces only between non-empty child texts, offsets each child’s spans into the combined text, and
//   collects tokPaths.
// - Always stores a span for the current path covering 0..combinedText.length.
// - Used by projectTree as the root projection.

function projectSubtree(token: SusyNode, path: number[]): SubtreeProjection {
  if (!token.kids || token.kids.length === 0) {
    const text = token.text ?? ''
    const span: Span = {
      from: 0,
      to: text.length,
      textFrom: 0,
      textTo: text.length
    }
    const spansByPath = new Map<string, Span>()
    spansByPath.set(serializePath(path), span)
    return {
      text,
      spansByPath,
      tokPaths: isSusyTok(token) ? [path] : []
    }
  }

  let combinedText = ''
  const spansByPath = new Map<string, Span>()
  const tokPaths: number[][] = []
  let prevHadText = false

  token.kids.forEach((child: SusyNode, idx: number) => {
    const childPath = [...path, idx]
    const childProjection = projectSubtree(child, childPath)

    if (prevHadText && childProjection.text.length > 0) {
      combinedText += ' '
    }

    const offset = combinedText.length
    combinedText += childProjection.text
    prevHadText = childProjection.text.length > 0

    for (const [key, span] of childProjection.spansByPath.entries()) {
      spansByPath.set(key, {
        from: span.from + offset,
        to: span.to + offset,
        textFrom: span.textFrom == null ? undefined : span.textFrom + offset,
        textTo: span.textTo == null ? undefined : span.textTo + offset
      })
    }

    tokPaths.push(...childProjection.tokPaths)
  })

  spansByPath.set(serializePath(path), { from: 0, to: combinedText.length })
  return { text: combinedText, spansByPath, tokPaths }
}

// Project the root tree into a full projection result.
export function projectTree(root: SusyNode): ProjectionResult {
  return projectSubtree(root, [])
}
