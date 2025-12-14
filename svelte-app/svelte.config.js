import adapter from './adapter-node-silent.js'
import adapterStatic from '@sveltejs/adapter-static'

const isTauri = process.env.TAURI === '1' || process.env.TAURI === 'true'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: isTauri ? adapterStatic({ fallback: '200.html' }) : adapter(),
    alias: {
      '@lush/yaml': '../yaml/src/index.ts'
    }
  }
}

export default config
