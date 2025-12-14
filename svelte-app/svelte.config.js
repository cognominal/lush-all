import adapter from './adapter-node-silent.js'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    alias: {
      '@lush/yaml': '../yaml/src/index.ts'
    }
  }
}

export default config
