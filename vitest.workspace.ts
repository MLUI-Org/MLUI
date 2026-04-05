import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/litegraph/vitest.config.ts',
  'apps/desktop/vitest.config.ts'
])
