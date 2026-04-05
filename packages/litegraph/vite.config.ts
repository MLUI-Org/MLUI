import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

import { litegraphAliasEntries } from './build/aliases'

export default defineConfig({
  resolve: {
    alias: litegraphAliasEntries
  },
  build: {
    sourcemap: true,
    lib: {
      entry: './src/litegraph.ts',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue']
    }
  },
  plugins: [
    dts({
      entryRoot: 'src',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts']
    })
  ],
  test: {
    environment: 'jsdom'
  }
})
