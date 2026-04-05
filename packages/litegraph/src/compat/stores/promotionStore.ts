type NodeId = number | string

export interface PromotedWidgetSource {
  sourceNodeId: string
  sourceWidgetName: string
  disambiguatingSourceNodeId?: string
}

function graphNodeKey(graphId: string, nodeId: NodeId) {
  return `${graphId}:${String(nodeId)}`
}

export function makePromotionEntryKey(entry: PromotedWidgetSource) {
  return JSON.stringify([
    entry.sourceNodeId,
    entry.sourceWidgetName,
    entry.disambiguatingSourceNodeId ?? ''
  ])
}

class PromotionStoreCompat {
  private readonly entries = new Map<string, PromotedWidgetSource[]>()

  clearGraph(graphId: string) {
    for (const key of this.entries.keys()) {
      if (key.startsWith(`${graphId}:`)) this.entries.delete(key)
    }
  }

  getPromotions(graphId: string, nodeId: NodeId) {
    return [...this.getPromotionsRef(graphId, nodeId)]
  }

  getPromotionsRef(graphId: string, nodeId: NodeId) {
    const key = graphNodeKey(graphId, nodeId)
    const current = this.entries.get(key)
    if (current) return current
    const next: PromotedWidgetSource[] = []
    this.entries.set(key, next)
    return next
  }

  setPromotions(graphId: string, nodeId: NodeId, nextEntries: PromotedWidgetSource[]) {
    this.entries.set(graphNodeKey(graphId, nodeId), [...nextEntries])
  }

  promote(graphId: string, nodeId: NodeId, entry: PromotedWidgetSource) {
    if (this.isPromoted(graphId, nodeId, entry)) return
    const nextEntries = this.getPromotions(graphId, nodeId)
    nextEntries.push(entry)
    this.setPromotions(graphId, nodeId, nextEntries)
  }

  demote(graphId: string, nodeId: NodeId, entry: PromotedWidgetSource) {
    const entryKey = makePromotionEntryKey(entry)
    const nextEntries = this.getPromotions(graphId, nodeId).filter(
      (candidate) => makePromotionEntryKey(candidate) !== entryKey
    )
    this.setPromotions(graphId, nodeId, nextEntries)
  }

  isPromoted(graphId: string, nodeId: NodeId, entry: PromotedWidgetSource) {
    const entryKey = makePromotionEntryKey(entry)
    return this.getPromotionsRef(graphId, nodeId).some(
      (candidate) => makePromotionEntryKey(candidate) === entryKey
    )
  }

  isPromotedByAny(graphId: string, entry: PromotedWidgetSource) {
    const entryKey = makePromotionEntryKey(entry)
    for (const [key, entries] of this.entries) {
      if (!key.startsWith(`${graphId}:`)) continue
      if (entries.some((candidate) => makePromotionEntryKey(candidate) === entryKey))
        return true
    }
    return false
  }
}

const promotionStore = new PromotionStoreCompat()

export function usePromotionStore() {
  return promotionStore
}
