import adapter from '@sveltejs/adapter-auto'

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
