export interface AutoPanControllerOptions {
  canvas: HTMLCanvasElement
  ds: { offset: [number, number]; scale: number }
  maxPanSpeed?: number
  onPan?: (panX: number, panY: number) => void
}

export class AutoPanController {
  private pointerX = 0
  private pointerY = 0
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly options: AutoPanControllerOptions) {}

  updatePointer(x: number, y: number) {
    this.pointerX = x
    this.pointerY = y
  }

  start() {
    if (this.timer) return

    this.timer = setInterval(() => {
      const rect = this.options.canvas.getBoundingClientRect()
      const edge = 32
      let panX = 0
      let panY = 0

      if (this.pointerX < rect.left + edge) panX = 4
      else if (this.pointerX > rect.right - edge) panX = -4

      if (this.pointerY < rect.top + edge) panY = 4
      else if (this.pointerY > rect.bottom - edge) panY = -4

      if (panX !== 0 || panY !== 0) this.options.onPan?.(panX, panY)
    }, 16)
  }

  stop() {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }
}
