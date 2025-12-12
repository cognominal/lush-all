import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      yaml: new URL('../yaml/src/public-api.ts', import.meta.url).pathname
    }
  }
})
