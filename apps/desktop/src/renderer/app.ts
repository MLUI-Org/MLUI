import {
  LGraph,
  LGraphCanvas,
  LGraphNode,
  LiteGraph
} from '@mlui/litegraph'

import type { UserProfile } from '../shared/userProfile'

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
  graphCanvas.setDirty(true, true)

  return { graphCanvas, graph }
}

function formatUpdatedAt(updatedAt: number) {
  return new Date(updatedAt).toLocaleString()
}

export async function mountDesktopApp(root: HTMLElement) {
  root.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <h1>MLUI Desktop</h1>
        <p class="lede">Electron shell with a standalone LiteGraph package, Bun-powered local builds, and Effect-backed SQLite persistence.</p>
        <label class="field">
          <span>Display name</span>
          <input id="display-name" type="text" placeholder="Your display name" />
        </label>
        <button id="save-profile" type="button">Save profile to SQLite</button>
        <p id="profile-status" class="status"></p>
      </aside>
      <main class="workspace">
        <div class="canvas-frame">
          <canvas id="graph-canvas"></canvas>
        </div>
      </main>
    </div>
  `

  const profileInput = root.querySelector<HTMLInputElement>('#display-name')
  const saveButton = root.querySelector<HTMLButtonElement>('#save-profile')
  const status = root.querySelector<HTMLParagraphElement>('#profile-status')
  const canvas = root.querySelector<HTMLCanvasElement>('#graph-canvas')

  if (!profileInput || !saveButton || !status || !canvas) {
    throw new Error('Desktop renderer failed to initialize required elements.')
  }

  const resizeCanvas = () => {
    const bounds = canvas.getBoundingClientRect()
    canvas.width = Math.max(800, Math.floor(bounds.width))
    canvas.height = Math.max(600, Math.floor(bounds.height))
  }

  resizeCanvas()
  const { graphCanvas } = createDemoGraph(canvas)
  graphCanvas.draw(true, true)

  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas()
    graphCanvas.resize()
    graphCanvas.setDirty(true, true)
  })
  resizeObserver.observe(canvas)

  let profile: UserProfile = await window.mlui.profile.load()
  profileInput.value = profile.displayName
  status.textContent = `Loaded profile "${profile.displayName}" updated ${formatUpdatedAt(profile.updatedAt)}.`

  saveButton.addEventListener('click', async () => {
    profile = await window.mlui.profile.save({
      ...profile,
      displayName: profileInput.value.trim() || profile.displayName,
      updatedAt: Date.now()
    })

    status.textContent = `Saved profile "${profile.displayName}" at ${formatUpdatedAt(profile.updatedAt)}.`
  })
}
