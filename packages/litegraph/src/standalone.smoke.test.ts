import { describe, expect, it } from 'vitest'

import { LGraph, LGraphNode, LiteGraph } from './litegraph'

class NumberSourceNode extends LGraphNode {
  override onExecute() {
    this.setOutputData(0, 7)
  }

  constructor() {
    super('Number Source')
    this.addOutput('value', 'number')
  }
}

class NumberSinkNode extends LGraphNode {
  public lastValue: unknown

  override onExecute() {
    this.lastValue = this.getInputData(0)
  }

  constructor() {
    super('Number Sink')
    this.addInput('value', 'number')
  }
}

describe('standalone litegraph package', () => {
  it('creates and connects a simple graph without MLUI host helpers', () => {
    LiteGraph.registerNodeType('mlui/number-source', NumberSourceNode)
    LiteGraph.registerNodeType('mlui/number-sink', NumberSinkNode)

    const graph = new LGraph()
    const source = new NumberSourceNode()
    const sink = new NumberSinkNode()

    graph.add(source)
    graph.add(sink)
    source.connect(0, sink, 0)

    source.onExecute?.()
    sink.onExecute?.()

    expect(graph._nodes).toHaveLength(2)
    expect(source.outputs[0]?.links?.length).toBe(1)
    expect(sink.inputs[0]?.link).toBeTypeOf('number')
  })
})
