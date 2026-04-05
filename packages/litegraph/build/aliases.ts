import { fileURLToPath, URL } from 'node:url'

function resolvePath(relativePath: string) {
  return fileURLToPath(new URL(relativePath, import.meta.url))
}

export const litegraphAliasEntries = [
  {
    find: '@/lib/litegraph/src',
    replacement: resolvePath('../src')
  },
  {
    find: '@/constants/groupNodeConstants',
    replacement: resolvePath('../src/compat/constants/groupNodeConstants.ts')
  },
  {
    find: '@/renderer/core/canvas/useAutoPan',
    replacement: resolvePath('../src/compat/renderer/core/canvas/useAutoPan.ts')
  },
  {
    find: '@/renderer/core/canvas/litegraph/litegraphLinkAdapter',
    replacement: resolvePath(
      '../src/compat/renderer/core/canvas/litegraph/litegraphLinkAdapter.ts'
    )
  },
  {
    find: '@/renderer/core/canvas/litegraph/slotCalculations',
    replacement: resolvePath(
      '../src/compat/renderer/core/canvas/litegraph/slotCalculations.ts'
    )
  },
  {
    find: '@/renderer/core/layout/operations/layoutMutations',
    replacement: resolvePath(
      '../src/compat/renderer/core/layout/operations/layoutMutations.ts'
    )
  },
  {
    find: '@/renderer/core/layout/store/layoutStore',
    replacement: resolvePath(
      '../src/compat/renderer/core/layout/store/layoutStore.ts'
    )
  },
  {
    find: '@/renderer/core/layout/types',
    replacement: resolvePath('../src/compat/renderer/core/layout/types.ts')
  },
  {
    find: '@/core/graph/subgraph/promotedWidgetTypes',
    replacement: resolvePath(
      '../src/compat/core/graph/subgraph/promotedWidgetTypes.ts'
    )
  },
  {
    find: '@/core/graph/subgraph/promotedWidgetView',
    replacement: resolvePath(
      '../src/compat/core/graph/subgraph/promotedWidgetView.ts'
    )
  },
  {
    find: '@/core/graph/subgraph/legacyProxyWidgetNormalization',
    replacement: resolvePath(
      '../src/compat/core/graph/subgraph/legacyProxyWidgetNormalization.ts'
    )
  },
  {
    find: '@/core/graph/subgraph/resolveConcretePromotedWidget',
    replacement: resolvePath(
      '../src/compat/core/graph/subgraph/resolveConcretePromotedWidget.ts'
    )
  },
  {
    find: '@/core/graph/subgraph/resolveSubgraphInputTarget',
    replacement: resolvePath(
      '../src/compat/core/graph/subgraph/resolveSubgraphInputTarget.ts'
    )
  },
  {
    find: '@/core/graph/subgraph/widgetNodeTypeGuard',
    replacement: resolvePath(
      '../src/compat/core/graph/subgraph/widgetNodeTypeGuard.ts'
    )
  },
  {
    find: '@/core/schemas/promotionSchema',
    replacement: resolvePath('../src/compat/core/schemas/promotionSchema.ts')
  },
  {
    find: '@/composables/node/canvasImagePreviewTypes',
    replacement: resolvePath(
      '../src/compat/composables/node/canvasImagePreviewTypes.ts'
    )
  },
  {
    find: '@/stores/promotionStore',
    replacement: resolvePath('../src/compat/stores/promotionStore.ts')
  },
  {
    find: '@/stores/widgetValueStore',
    replacement: resolvePath('../src/compat/stores/widgetValueStore.ts')
  },
  {
    find: '@/stores/domWidgetStore',
    replacement: resolvePath('../src/compat/stores/domWidgetStore.ts')
  },
  {
    find: '@/utils/graphTraversalUtil',
    replacement: resolvePath('../src/compat/utils/graphTraversalUtil.ts')
  },
  {
    find: '@/utils/colorUtil',
    replacement: resolvePath('../src/compat/utils/colorUtil.ts')
  },
  {
    find: '@/utils/__tests__/litegraphTestUtils',
    replacement: resolvePath('../src/test-utils/litegraphTestUtils.ts')
  },
  {
    find: '@/components/curve/types',
    replacement: resolvePath('../src/compat/components/curve/types.ts')
  },
  {
    find: '@/i18n',
    replacement: resolvePath('../src/compat/i18n.ts')
  }
]
