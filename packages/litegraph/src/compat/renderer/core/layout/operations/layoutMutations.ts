import type { LayoutSource, Position } from '../types'

interface LinkRecord {
  id: number
  fromNodeId: string
  fromSlot: number
  toNodeId: string
  toSlot: number
}

interface RerouteRecord {
  id: number
  position: Position
}

interface NodeRecord {
  id: string
  position?: Position
  size?: { width: number; height: number }
}

class LayoutMutationsCompat {
  private source: LayoutSource | null = null
  readonly links = new Map<number, LinkRecord>()
  readonly reroutes = new Map<number, RerouteRecord>()
  readonly nodes = new Map<string, NodeRecord>()

  setSource(source: LayoutSource) {
    this.source = source
  }

  createLink(
    id: number,
    fromNodeId: number | string,
    fromSlot: number,
    toNodeId: number | string,
    toSlot: number
  ) {
    this.links.set(id, {
      id,
      fromNodeId: String(fromNodeId),
      fromSlot,
      toNodeId: String(toNodeId),
      toSlot
    })
  }

  deleteLink(linkId: number) {
    this.links.delete(linkId)
  }

  createReroute(
    id: number,
    position: Position,
    _parentId?: number,
    _linkIds?: number[]
  ) {
    this.reroutes.set(id, { id, position })
  }

  moveReroute(id: number, position: Position) {
    const current = this.reroutes.get(id)
    if (!current) {
      this.reroutes.set(id, { id, position })
      return
    }
    current.position = position
  }

  deleteReroute(id: number) {
    this.reroutes.delete(id)
  }

  moveNode(id: string, position: Position) {
    const current = this.nodes.get(id) ?? { id }
    current.position = position
    this.nodes.set(id, current)
  }

  resizeNode(id: string, size: { width: number; height: number }) {
    const current = this.nodes.get(id) ?? { id }
    current.size = size
    this.nodes.set(id, current)
  }
}

const layoutMutations = new LayoutMutationsCompat()

export function useLayoutMutations() {
  return layoutMutations
}
