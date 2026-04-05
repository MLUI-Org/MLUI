import { defineConfig } from 'vitest/config'

import { litegraphAliasEntries } from './build/aliases'

export default defineConfig({
  resolve: {
    alias: litegraphAliasEntries
  },
  test: {
    environment: 'jsdom',
    include: ['src/standalone.smoke.test.ts']
  }
})
