export interface PromotedWidgetSource {
  sourceNodeId: string
  sourceWidgetName: string
  disambiguatingSourceNodeId?: string
}

export interface PromotedWidgetView extends PromotedWidgetSource {
  readonly __promotedWidgetView: true
  name: string
  label?: string
  type: 'promoted'
  value?: unknown
  node?: unknown
}

export function isPromotedWidgetView(value: unknown): value is PromotedWidgetView {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__promotedWidgetView' in value &&
    (value as { __promotedWidgetView?: boolean }).__promotedWidgetView === true
  )
}
