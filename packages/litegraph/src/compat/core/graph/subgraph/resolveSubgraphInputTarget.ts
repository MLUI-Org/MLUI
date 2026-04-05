export function resolveSubgraphInputTarget(
  subgraphNode: {
    inputs?: Array<{
      name?: string
      _widget?: { sourceNodeId?: string; sourceWidgetName?: string }
    }>
  },
  widgetName: string
) {
  const input = subgraphNode.inputs?.find((candidate) => candidate.name === widgetName)
  if (!input?._widget?.sourceNodeId || !input._widget.sourceWidgetName) {
    return undefined
  }

  return {
    nodeId: input._widget.sourceNodeId,
    widgetName: input._widget.sourceWidgetName
  }
}
