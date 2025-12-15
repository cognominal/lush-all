import { sveltekit } from '@sveltejs/kit/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    chunkSizeWarningLimit: 700
  },
  resolve: {
    alias: {
      '@lush/yaml': path.resolve(here, '../yaml/src/index.ts'),
      process: 'process/browser',
      buffer: 'buffer'
    }
  },
  server: {
    fs: {
      allow: [path.resolve(here, '..')]
    }
  }
})
