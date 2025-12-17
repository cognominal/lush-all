import type { Config } from 'tailwindcss'
import { skeleton } from '@skeletonlabs/tw-plugin'

const sk = skeleton({
  themes: { preset: [{ name: 'skeleton', enhancements: true }] }
})

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      ...(sk.config?.theme?.extend ?? {})
    }
  },
  plugins: [sk.handler]
} satisfies Config
