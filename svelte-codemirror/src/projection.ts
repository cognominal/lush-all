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

  const canUseRanges =
    typeof token.text === 'string' &&
    typeof token.x === 'number' &&
    token.kids.every((child) => typeof child.x === 'number')

  if (canUseRanges) {
    combinedText = token.text ?? ''
    for (const [idx, child] of token.kids.entries()) {
      const childPath = [...path, idx]
      const childProjection = projectSubtree(child, childPath)
      const offset = (child.x ?? 0) - (token.x ?? 0)
      for (const [key, span] of childProjection.spansByPath.entries()) {
        spansByPath.set(key, {
          from: span.from + offset,
          to: span.to + offset,
          textFrom: span.textFrom == null ? undefined : span.textFrom + offset,
          textTo: span.textTo == null ? undefined : span.textTo + offset
        })
      }
      tokPaths.push(...childProjection.tokPaths)
    }
    spansByPath.set(serializePath(path), { from: 0, to: combinedText.length })
    return { text: combinedText, spansByPath, tokPaths }
  }

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
