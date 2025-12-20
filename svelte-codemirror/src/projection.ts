import type { InputToken } from '../../lush-types/index.ts'
import type { Span } from './types'
import { isInputToken, serializePath } from './tree'

export interface ProjectionResult {
  text: string
  spansByPath: Map<string, Span>
  inputTokenPaths: number[][]
}

type SubtreeProjection = {
  text: string
  spansByPath: Map<string, Span>
  inputTokenPaths: number[][]
}

function projectSubtree(token: InputToken, path: number[]): SubtreeProjection {
  if (!token.subTokens || token.subTokens.length === 0) {
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
      inputTokenPaths: isInputToken(token) ? [path] : []
    }
  }

  let combinedText = ''
  const spansByPath = new Map<string, Span>()
  const inputTokenPaths: number[][] = []
  let prevHadText = false

  token.subTokens.forEach((child: InputToken, idx: number) => {
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

    inputTokenPaths.push(...childProjection.inputTokenPaths)
  })

  spansByPath.set(serializePath(path), { from: 0, to: combinedText.length })
  return { text: combinedText, spansByPath, inputTokenPaths }
}

export function projectTree(root: InputToken): ProjectionResult {
  return projectSubtree(root, [])
}
