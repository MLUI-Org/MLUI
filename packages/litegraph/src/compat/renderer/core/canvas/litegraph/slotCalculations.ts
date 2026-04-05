import { LiteGraph } from '../../../../../litegraph'

type SlotLike = {
  pos?: [number, number]
}

export interface SlotPositionContext {
  nodeX: number
  nodeY: number
  nodeWidth: number
  nodeHeight: number
  collapsed: boolean
  collapsedWidth?: number
  slotStartY?: number
  inputs: SlotLike[]
  outputs: SlotLike[]
  widgets?: unknown[]
}

function calculateSlotPosition(
  context: SlotPositionContext,
  slotIndex: number,
  isInput: boolean
): [number, number] {
  const out: [number, number] = [0, 0]

  if (context.collapsed) {
    const width = context.collapsedWidth || LiteGraph.NODE_COLLAPSED_WIDTH
    out[0] = isInput ? context.nodeX : context.nodeX + width
    out[1] = context.nodeY - LiteGraph.NODE_TITLE_HEIGHT * 0.5
    return out
  }

  const slot = isInput ? context.inputs[slotIndex] : context.outputs[slotIndex]
  if (slot?.pos) {
    out[0] = context.nodeX + slot.pos[0]
    out[1] = context.nodeY + slot.pos[1]
    return out
  }

  const offset = LiteGraph.NODE_SLOT_HEIGHT * 0.5
  out[0] = isInput
    ? context.nodeX + offset
    : context.nodeX + context.nodeWidth + 1 - offset
  out[1] =
    context.nodeY +
    (slotIndex + 0.7) * LiteGraph.NODE_SLOT_HEIGHT +
    (context.slotStartY || 0)
  return out
}

export function calculateInputSlotPosFromSlot(
  context: SlotPositionContext,
  input: SlotLike
): [number, number] {
  return calculateSlotPosition(context, context.inputs.indexOf(input), true)
}

export function getSlotPosition(
  node: {
    pos: [number, number]
    size: [number, number]
    flags: { collapsed?: boolean }
    _collapsed_width?: number
    inputs: SlotLike[]
    outputs: SlotLike[]
    widgets?: unknown[]
    constructor: { slot_start_y?: number }
  },
  slotIndex: number,
  isInput: boolean
): [number, number] {
  return calculateSlotPosition(
    {
      nodeX: node.pos[0],
      nodeY: node.pos[1],
      nodeWidth: node.size[0],
      nodeHeight: node.size[1],
      collapsed: node.flags.collapsed ?? false,
      collapsedWidth: node._collapsed_width,
      slotStartY: node.constructor.slot_start_y,
      inputs: node.inputs,
      outputs: node.outputs,
      widgets: node.widgets
    },
    slotIndex,
    isInput
  )
}
