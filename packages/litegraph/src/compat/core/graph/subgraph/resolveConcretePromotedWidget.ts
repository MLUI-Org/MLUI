export function resolveConcretePromotedWidget(
  subgraphNode: {
    subgraph?: {
      getNodeById?: (id: string) => {
        widgets?: Array<{ name: string }>
      } | null | undefined
    }
  },
  sourceNodeId: string,
  sourceWidgetName: string
) {
  const node = subgraphNode.subgraph?.getNodeById?.(sourceNodeId)
  const widget = node?.widgets?.find(
    (candidate) => candidate.name === sourceWidgetName
  )

  if (!node || !widget) {
    return { status: 'missing' as const }
  }

  return {
    status: 'resolved' as const,
    resolved: { node, widget }
  }
}
