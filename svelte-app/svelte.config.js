import adapter from './adapter-node-silent.js'
import adapterStatic from '@sveltejs/adapter-static'

const isTauri = process.env.TAURI === '1' || process.env.TAURI === 'true'
const isTauriServer = process.env.TAURI_SERVER === '1' || process.env.TAURI_SERVER === 'true'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Default: Tauri builds are static (no server). For AuthKit in a packaged Tauri app we need a server,
    // so TAURI_SERVER=1 switches back to adapter-node.
    adapter: isTauri && !isTauriServer ? adapterStatic({ fallback: '200.html' }) : adapter(),
    alias: {
      '@lush/yaml': '../yaml/src/index.ts',
      '@lush/structural': '../svelte-codemirror/src'
    }
  }
}

export default config
