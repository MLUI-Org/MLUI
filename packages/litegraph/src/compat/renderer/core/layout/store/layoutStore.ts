import { ref } from 'vue'

import type {
  LayoutSource,
  LinkSegmentHitLayout,
  RerouteHitLayout,
  SlotHitLayout
} from '../types'

class LayoutStoreCompat {
  readonly isDraggingVueNodes = ref(false)
  pendingSlotSync = false
  private source: LayoutSource | null = null

  setSource(source: LayoutSource) {
    this.source = source
  }

  batchUpdateNodeBounds(_: unknown[]) {}

  deleteLinkLayout(_: number) {}

  querySlotAtPoint(_: { x: number; y: number }): SlotHitLayout | undefined {
    return undefined
  }

  queryRerouteAtPoint(_: { x: number; y: number }): RerouteHitLayout | undefined {
    return undefined
  }

  queryLinkSegmentAtPoint(
    _: { x: number; y: number },
    __: CanvasRenderingContext2D | null
  ): LinkSegmentHitLayout | undefined {
    return undefined
  }
}

export const layoutStore = new LayoutStoreCompat()
