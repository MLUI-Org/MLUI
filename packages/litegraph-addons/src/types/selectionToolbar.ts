import type { ColorOption, LGraphCanvas, Positionable } from "@mlui/litegraph";

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SelectionToolbarColorableItem = Positionable & {
  setColorOption(colorOption: ColorOption | null): void;
  getColorOption(): ColorOption | null;
};

export interface SelectionToolbarContext {
  graphCanvas: LGraphCanvas;
  host: HTMLElement;
  selection: readonly Positionable[];
  colorableSelection: readonly SelectionToolbarColorableItem[];
  selectionBounds: SelectionBounds;
  closePanel: () => void;
  refresh: () => void;
}

export interface SelectionToolbarAction {
  id: string;
  label: string;
  buttonClassName?: string;
  isActive?: (context: SelectionToolbarContext) => boolean;
  isDisabled?: (context: SelectionToolbarContext) => boolean;
  onClick?: (context: SelectionToolbarContext) => void;
  renderButtonContent: (context: SelectionToolbarContext) => string;
  renderPanel?: (context: SelectionToolbarContext) => HTMLElement | null;
}

export interface AttachSelectionToolbarOptions {
  graphCanvas: LGraphCanvas;
  host: HTMLElement;
  actions?: readonly SelectionToolbarAction[];
}
