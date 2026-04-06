import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/litegraph/vitest.config.ts',
      'packages/litegraph-nodes/vitest.config.ts',
      'apps/desktop/vitest.config.ts'
    ]
  }
})
