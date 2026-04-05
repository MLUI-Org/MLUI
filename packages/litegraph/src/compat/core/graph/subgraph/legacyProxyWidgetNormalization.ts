import type { PromotedWidgetSource } from './promotedWidgetTypes'

export function normalizeLegacyProxyWidgetEntry(
  entry: string[] | PromotedWidgetSource
): PromotedWidgetSource {
  if (Array.isArray(entry)) {
    const [sourceNodeId = '', sourceWidgetName = '', disambiguatingSourceNodeId] =
      entry
    return {
      sourceNodeId,
      sourceWidgetName,
      disambiguatingSourceNodeId
    }
  }

  return entry
}
