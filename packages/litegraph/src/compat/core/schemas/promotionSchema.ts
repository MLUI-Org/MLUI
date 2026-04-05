import type { PromotedWidgetSource } from '../graph/subgraph/promotedWidgetTypes'
import { normalizeLegacyProxyWidgetEntry } from '../graph/subgraph/legacyProxyWidgetNormalization'

export function parseProxyWidgets(
  raw: unknown
): PromotedWidgetSource[] {
  if (Array.isArray(raw)) {
    return raw.map((entry) =>
      normalizeLegacyProxyWidgetEntry(
        entry as string[] | PromotedWidgetSource
      )
    )
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parseProxyWidgets(parsed)
    } catch {
      return []
    }
  }

  return []
}
