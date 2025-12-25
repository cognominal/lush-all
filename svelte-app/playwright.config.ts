import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.pw.ts',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174'
  },
  webServer: {
    command: 'bun run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI
  }
})
