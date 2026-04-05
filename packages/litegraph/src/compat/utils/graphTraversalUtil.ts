export function forEachNode(
  graph: { nodes?: unknown[]; _nodes?: unknown[] } | null | undefined,
  visitor: (node: any) => void
) {
  if (!graph) return

  const nodes = (graph.nodes || graph._nodes || []) as any[]
  for (const node of nodes) {
    visitor(node)
    if (node?.subgraph) forEachNode(node.subgraph, visitor)
  }
}
