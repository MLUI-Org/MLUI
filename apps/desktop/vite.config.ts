import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

import { litegraphAliasEntries } from '../../packages/litegraph/build/aliases'

export default defineConfig({
  base: './',
  resolve: {
    alias: [
      {
        find: '@mlui/litegraph/litegraph.css',
        replacement: fileURLToPath(
          new URL('../../packages/litegraph/public/css/litegraph.css', import.meta.url)
        )
      },
      {
        find: '@mlui/litegraph',
        replacement: fileURLToPath(
          new URL('../../packages/litegraph/src/litegraph.ts', import.meta.url)
        )
      },
      ...litegraphAliasEntries
    ]
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: false
  }
})
