import { useEffect, useRef, useState } from 'react'

import {
  LGraph,
  LGraphCanvas,
  LGraphNode,
  LiteGraph
} from '@mlui/litegraph'

class NumberSourceNode extends LGraphNode {
  constructor() {
    super('Profile Seed')
    this.pos = [80, 120]
    this.addOutput('value', 'number')
    this.properties.seed = 7
  }

  override onExecute() {
    this.setOutputData(0, this.properties.seed)
  }
}

class NumberSinkNode extends LGraphNode {
  constructor() {
    super('Debug Sink')
    this.pos = [380, 120]
    this.addInput('value', 'number')
  }
}

function ensureDemoNodesRegistered() {
  if (!LiteGraph.registered_node_types['mlui/profile-seed']) {
    LiteGraph.registerNodeType('mlui/profile-seed', NumberSourceNode)
  }

  if (!LiteGraph.registered_node_types['mlui/debug-sink']) {
    LiteGraph.registerNodeType('mlui/debug-sink', NumberSinkNode)
  }
}

function createDemoGraph(canvas: HTMLCanvasElement) {
  ensureDemoNodesRegistered()

  const graph = new LGraph()
  const source = new NumberSourceNode()
  const sink = new NumberSinkNode()

  graph.add(source)
  graph.add(sink)
  source.connect(0, sink, 0)

  const graphCanvas = new LGraphCanvas(canvas, graph)
  graphCanvas.background_image = null
  graphCanvas.render_connections_border = true
  graphCanvas.getCanvasMenuOptions = () => []
  graphCanvas.getNodeMenuOptions = () => []
  graphCanvas.processContextMenu = () => {}
  graphCanvas.setDirty(true, true)

  return graphCanvas
}

function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  return (
    <div className="window-chrome">
      <div className="window-drag-region" />
      <div className="window-controls" aria-label="Window controls">
        <button
          className="window-control minimize"
          type="button"
          aria-label="Minimize window"
          onClick={() => {
            void window.mlui.window.minimize()
          }}
        />
        <button
          className={`window-control maximize${isMaximized ? ' is-maximized' : ''}`}
          type="button"
          aria-label="Toggle window size"
          onClick={async () => {
            const nextState = await window.mlui.window.toggleMaximize()
            setIsMaximized(nextState)
          }}
        />
        <button
          className="window-control close"
          type="button"
          aria-label="Close window"
          onClick={() => {
            void window.mlui.window.close()
          }}
        />
      </div>
    </div>
  )
}

export function App() {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const shell = shellRef.current
    const canvas = canvasRef.current
    if (!shell || !canvas) return

    const graphCanvas = createDemoGraph(canvas)
    let frameId = 0

    const resizeCanvas = () => {
      frameId = 0

      const width = Math.floor(shell.clientWidth)
      const height = Math.floor(shell.clientHeight)

      if (width <= 0 || height <= 0) return

      graphCanvas.resize(width, height)
      graphCanvas.draw(true, true)
    }

    const scheduleResize = () => {
      if (frameId !== 0) return
      frameId = window.requestAnimationFrame(resizeCanvas)
    }

    scheduleResize()

    const resizeObserver = new ResizeObserver(() => {
      scheduleResize()
    })
    resizeObserver.observe(shell)

    window.addEventListener('contextmenu', preventContextMenu)
    window.addEventListener('resize', scheduleResize)

    void window.mlui.profile.load().then((profile) =>
      window.mlui.profile.save({
        ...profile,
        lastGraphName: 'Getting Started',
        updatedAt: Date.now()
      })
    )

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('contextmenu', preventContextMenu)
      window.removeEventListener('resize', scheduleResize)
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
      graphCanvas.setDirty(false, false)
    }
  }, [])

  return (
    <div ref={shellRef} className="shell">
      <WindowControls />
      <canvas ref={canvasRef} id="graph-canvas" />
    </div>
  )
}

function preventContextMenu(event: MouseEvent) {
  event.preventDefault()
}
