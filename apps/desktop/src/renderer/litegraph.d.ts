declare module '@mlui/litegraph' {
  export class LGraph {
    add(node: LGraphNode): void
  }

  export class LGraphNode {
    pos: [number, number]
    properties: Record<string, any>

    constructor(title?: string, type?: string)

    addInput(name: string, type: string): void
    addOutput(name: string, type: string): void
    connect(outputIndex: number, targetNode: LGraphNode, inputIndex: number): void
    setOutputData(slot: number, value: unknown): void
    onExecute?(): void
  }

  export class LGraphCanvas {
    background_image: string | null
    render_connections_border: boolean

    constructor(canvas: HTMLCanvasElement, graph: LGraph)

    draw(fgCanvas?: boolean, bgCanvas?: boolean): void
    resize(): void
    setDirty(fgCanvas: boolean, bgCanvas?: boolean): void
  }

  export const LiteGraph: {
    registered_node_types: Record<string, unknown>
    registerNodeType(type: string, ctor: typeof LGraphNode): void
  }
}
