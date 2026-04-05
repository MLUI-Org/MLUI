export interface LinkRenderContext {
  renderMode?: number
  connectionWidth?: number
  renderBorder?: boolean
  lowQuality?: boolean
  highQualityRender?: boolean
  scale?: number
  linkMarkerShape?: number
  renderConnectionArrows?: boolean
  highlightedLinks?: Set<string>
  defaultLinkColor?: string
  linkTypeColors?: Record<string, string>
  disabledPattern?: CanvasPattern | null
}

export class LitegraphLinkAdapter {
  constructor(private readonly _useVueRenderer: boolean) {}

  renderLinkDirect(
    ctx: CanvasRenderingContext2D,
    a: readonly [number, number],
    b: readonly [number, number],
    _link: { id?: number; type?: string | number } | null,
    skipBorder: boolean,
    _flow: number | null,
    color: string | null,
    _startDir: number,
    _endDir: number,
    context: LinkRenderContext,
    options: {
      startControl?: readonly [number, number]
      endControl?: readonly [number, number]
      reroute?: unknown
      num_sublines?: number
      disabled?: boolean
    } = {}
  ) {
    const distance = Math.abs(b[0] - a[0])
    const controlOffset = Math.max(40, distance * 0.5)
    const startControl = options.startControl ?? [controlOffset, 0]
    const endControl = options.endControl ?? [-controlOffset, 0]
    const stroke = color || context.defaultLinkColor || '#7dd3fc'

    ctx.save()
    ctx.lineWidth = context.connectionWidth ?? 3
    ctx.strokeStyle = stroke
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.bezierCurveTo(
      a[0] + startControl[0],
      a[1] + startControl[1],
      b[0] + endControl[0],
      b[1] + endControl[1],
      b[0],
      b[1]
    )
    ctx.stroke()

    if (!skipBorder) {
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)'
      ctx.stroke()
    }

    ctx.restore()
  }

  renderDraggingLink(
    ctx: CanvasRenderingContext2D,
    a: readonly [number, number],
    b: readonly [number, number],
    color: string | null,
    startDir: number,
    endDir: number,
    context: LinkRenderContext
  ) {
    this.renderLinkDirect(
      ctx,
      a,
      b,
      null,
      false,
      null,
      color,
      startDir,
      endDir,
      context
    )
  }
}
