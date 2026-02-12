import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __editorWorkspaceActivePath?: number[] | null
    __structuralEditorDebug?: { handleKey: (key: string) => void }
    __structuralEditorState?: { currentTokPath?: number[] }
  }
}

export {}

// Verify structural editor focus changes update the shared active path.
test('structural editor updates workspace focus path', async ({ page }) => {
  await page.goto('/editor')
  await page.waitForFunction(() => Boolean(window.__editorWorkspaceActivePath))
  const initial = await page.evaluate(() =>
    (window as Window & { __editorWorkspaceActivePath?: number[] | null })
      .__editorWorkspaceActivePath ?? null
  )
  await page.evaluate(() =>
    (window as Window & {
      __structuralEditorDebug?: { handleKey: (key: string) => void }
    }).__structuralEditorDebug?.handleKey('Tab')
  )
  await page.waitForFunction((previous) => {
    const next = (window as Window & { __editorWorkspaceActivePath?: number[] | null })
      .__editorWorkspaceActivePath
    return JSON.stringify(next) !== JSON.stringify(previous)
  }, initial)
  const [nextPath, tokPath] = await page.evaluate(() => {
    const workspace = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
      __structuralEditorState?: { currentTokPath?: number[] }
    }
    return [workspace.__editorWorkspaceActivePath ?? null, workspace.__structuralEditorState?.currentTokPath ?? null]
  })
  expect(nextPath).not.toEqual(initial)
  expect(nextPath).toEqual(tokPath)
})

// Verify Susy YAML clicks drive the structural editor selection.
test('susy yaml click syncs structural editor focus', async ({ page }) => {
  await page.goto('/editor')
  await page.waitForSelector('.cm-content')
  await page.locator('.cm-content').nth(2).click({ position: { x: 10, y: 10 } })
  await page.waitForFunction(() => {
    const workspace = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
      __structuralEditorState?: { currentTokPath?: number[] }
    }
    const active = workspace.__editorWorkspaceActivePath
    const tok = workspace.__structuralEditorState?.currentTokPath
    if (!active || !tok) return false
    return JSON.stringify(active) === JSON.stringify(tok)
  })
  const [activePath, tokPath] = await page.evaluate(() => {
    const workspace = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
      __structuralEditorState?: { currentTokPath?: number[] }
    }
    return [workspace.__editorWorkspaceActivePath ?? null, workspace.__structuralEditorState?.currentTokPath ?? null]
  })
  expect(activePath).toEqual(tokPath)
})

// Verify Escape in normal mode expands focus to the parent path.
test('escape in normal mode expands selection and syncs focus path', async ({ page }) => {
  await page.goto('/editor')
  await page.waitForFunction(() => {
    const workspace = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
    }
    const active = workspace.__editorWorkspaceActivePath
    return Array.isArray(active) && active.length > 0
  })
  const initial = await page.evaluate(() =>
    (window as Window & { __editorWorkspaceActivePath?: number[] | null })
      .__editorWorkspaceActivePath ?? null
  )
  await page.evaluate(() =>
    (window as Window & {
      __structuralEditorDebug?: { handleKey: (key: string) => void }
    }).__structuralEditorDebug?.handleKey('Tab')
  )
  await page.waitForFunction((previous) => {
    const workspace = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
    }
    const active = workspace.__editorWorkspaceActivePath
    return JSON.stringify(active) !== JSON.stringify(previous)
  }, initial)
  const beforeEscape = await page.evaluate(() =>
    (window as Window & { __editorWorkspaceActivePath?: number[] | null })
      .__editorWorkspaceActivePath ?? null
  )
  await page.evaluate(() =>
    (window as Window & {
      __structuralEditorDebug?: { handleKey: (key: string) => void }
    }).__structuralEditorDebug?.handleKey('Escape')
  )
  await page.waitForFunction((before) => {
    const workspace = window as Window & {
      __editorWorkspaceActivePath?: number[] | null
      __structuralEditorState?: { currentTokPath?: number[] }
    }
    const active = workspace.__editorWorkspaceActivePath
    const tok = workspace.__structuralEditorState?.currentTokPath ?? null
    if (!Array.isArray(before) || !Array.isArray(active) || !Array.isArray(tok)) {
      return false
    }
    if (active.length !== before.length - 1) return false
    if (JSON.stringify(active) !== JSON.stringify(before.slice(0, -1))) return false
    return JSON.stringify(active) === JSON.stringify(tok)
  }, beforeEscape)
})
