import { expect, test } from '@playwright/test'

test('glossary link opens inside docs view', async ({ page }) => {
  await page.goto('/docs?path=lush.md')

  const glossaryLink = page.getByRole('link', { name: /glossary/i })
  await expect(glossaryLink).toHaveAttribute('href', /\/docs\?path=glossary\.md/)

  await glossaryLink.click()
  await expect(page).toHaveURL(/\/docs\?path=glossary\.md/)
})
