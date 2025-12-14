import { describe, expect, test } from 'vitest'
import { lushify } from '../src/public-api.ts'

const toText = (lines: ReturnType<typeof lushify>) =>
  (lines ?? []).map(line => line.map(t => t.text ?? '').join(''))

describe('lushify', () => {
  test('produces TokenMultiLine from object input', () => {
    const res = lushify({ foo: 'bar' })
    expect(res).toBeDefined()
    expect(res?.length).toBe(2)
    expect(toText(res)).toEqual(['foo: bar', ''])
  })

  test('returns undefined when keepUndefined is false', () => {
    expect(lushify(undefined, { keepUndefined: false })).toBeUndefined()
  })
})
