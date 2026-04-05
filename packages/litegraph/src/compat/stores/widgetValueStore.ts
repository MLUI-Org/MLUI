type GraphId = string
type NodeId = number | string

export interface WidgetState {
  nodeId: NodeId
  name: string
  type: string
  value: unknown
  label?: string
  disabled?: boolean
  serialize?: boolean
  options?: Record<string, unknown>
}

function graphKey(graphId: GraphId, nodeId: NodeId, widgetName: string) {
  return `${graphId}:${String(nodeId)}:${widgetName}`
}

class WidgetValueStoreCompat {
  private readonly widgets = new Map<string, WidgetState>()

  registerWidget(
    graphId: GraphId,
    widget: Omit<WidgetState, 'nodeId'> & Partial<Pick<WidgetState, 'nodeId'>>
  ) {
    const nodeId = widget.nodeId ?? -1
    const state: WidgetState = {
      disabled: false,
      serialize: true,
      ...widget,
      nodeId
    }
    this.widgets.set(graphKey(graphId, nodeId, widget.name), state)
    return state
  }

  getWidget(graphId: GraphId, nodeId: NodeId, widgetName: string) {
    return this.widgets.get(graphKey(graphId, nodeId, widgetName))
  }

  clearGraph(graphId: GraphId) {
    for (const key of this.widgets.keys()) {
      if (key.startsWith(`${graphId}:`)) this.widgets.delete(key)
    }
  }
}

const widgetValueStore = new WidgetValueStoreCompat()

export function useWidgetValueStore() {
  return widgetValueStore
}
