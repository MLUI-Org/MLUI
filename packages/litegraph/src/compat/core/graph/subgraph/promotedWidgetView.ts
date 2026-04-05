import {
  isPromotedWidgetView,
  type PromotedWidgetSource,
  type PromotedWidgetView
} from './promotedWidgetTypes'

export { isPromotedWidgetView }
export type { PromotedWidgetView }

export function createPromotedWidgetView(
  node: unknown,
  sourceNodeId: string,
  sourceWidgetName: string,
  displayName?: string,
  disambiguatingSourceNodeId?: string,
  slotName?: string
): PromotedWidgetView {
  return {
    __promotedWidgetView: true,
    node,
    name: slotName || sourceWidgetName,
    label: displayName,
    type: 'promoted',
    value: undefined,
    sourceNodeId,
    sourceWidgetName,
    disambiguatingSourceNodeId
  }
}

export function toPromotedWidgetSource(
  view: PromotedWidgetView
): PromotedWidgetSource {
  return {
    sourceNodeId: view.sourceNodeId,
    sourceWidgetName: view.sourceWidgetName,
    disambiguatingSourceNodeId: view.disambiguatingSourceNodeId
  }
}
