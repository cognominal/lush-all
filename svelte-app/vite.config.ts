import { sveltekit } from '@sveltejs/kit/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split large dependencies to keep chunks under the warning limit.
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('codemirror') || id.includes('@codemirror')) return 'codemirror'
            if (id.includes('/yaml/')) return 'yaml'
            if (id.includes('svelte')) return 'svelte'
            return 'vendor'
          }
          if (id.includes('/lush-types/')) return 'lush-types'
          return undefined
        }
      }
    }
  },
  resolve: {
    alias: {
      '@lush/yaml': path.resolve(here, '../yaml/src/index.ts'),
      '@lush/structural': path.resolve(here, '../svelte-codemirror/src'),
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
