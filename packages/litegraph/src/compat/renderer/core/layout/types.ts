export enum LayoutSource {
  Canvas = 'canvas',
  Unknown = 'unknown'
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Position {
  x: number
  y: number
}

export interface SlotHitLayout {
  nodeId: string
  index: number
  type: 'input' | 'output'
  position: Position
}

export interface RerouteHitLayout {
  id: number
}

export interface LinkSegmentHitLayout {
  type: 'link' | 'reroute'
  linkId?: number
  rerouteId?: number
}
