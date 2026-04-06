import {
  isColorable,
  type ColorOption,
  type LGraphCanvas,
  type Positionable,
} from "@mlui/litegraph";

import { createDefaultSelectionToolbarActions } from "../actions";
import type {
  AttachSelectionToolbarOptions,
  SelectionBounds,
  SelectionToolbarContext,
} from "../types";

const POPOVER_OFFSET = 12;
const POPOVER_EDGE_PADDING = 12;
const SELECTION_OUTLINE_PADDING = 10;

interface ScreenBounds extends SelectionBounds {}

export function attachSelectionToolbar({
  graphCanvas,
  host,
  actions = createDefaultSelectionToolbarActions(),
}: AttachSelectionToolbarOptions): () => void {
  const overlay = document.createElement("div");
  overlay.className = "litegraph-selection-addon";
  overlay.hidden = true;

  const outline = document.createElement("div");
  outline.className = "litegraph-selection-addon__outline";

  const popover = document.createElement("div");
  popover.className = "litegraph-selection-addon__popover";

  const toolbar = document.createElement("div");
  toolbar.className = "litegraph-selection-addon__toolbar";

  popover.append(toolbar);
  overlay.append(outline, popover);
  host.append(overlay);

  stopEventPropagation(popover);

  const previousOnSelectionChange = graphCanvas.onSelectionChange;
  const previousOnDrawOverlay = graphCanvas.onDrawOverlay;

  const resizeObserver = new ResizeObserver(() => {
    syncOverlay();
  });
  resizeObserver.observe(host);

  let openPanelActionId: string | null = null;
  let renderSignature = "";

  const closePanel = () => {
    if (openPanelActionId === null) return;
    openPanelActionId = null;
    renderSignature = "";
  };

  const refresh = () => {
    renderSignature = "";
    syncOverlay();
  };

  const buildContext = (
    selection: readonly Positionable[],
    selectionBounds: SelectionBounds,
  ): SelectionToolbarContext => ({
    graphCanvas,
    host,
    selection,
    colorableSelection: selection.filter(isColorable) as unknown as SelectionToolbarContext["colorableSelection"],
    selectionBounds,
    closePanel,
    refresh,
  });

  const renderToolbar = (context: SelectionToolbarContext) => {
    const nextSignature = createRenderSignature(context, openPanelActionId);
    if (nextSignature === renderSignature) return;

    renderSignature = nextSignature;
    toolbar.replaceChildren();
    popover.querySelector(".litegraph-selection-addon__panel")?.remove();

    let activePanel: HTMLElement | null = null;

    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = ["litegraph-selection-addon__button", action.buttonClassName]
        .filter(Boolean)
        .join(" ");
      button.setAttribute("aria-label", action.label);
      button.title = action.label;
      button.disabled = action.isDisabled?.(context) ?? false;
      button.dataset.active = String(
        openPanelActionId === action.id || action.isActive?.(context) === true,
      );
      button.innerHTML = action.renderButtonContent(context);

      button.addEventListener("click", () => {
        if (button.disabled) return;

        if (action.renderPanel) {
          openPanelActionId = openPanelActionId === action.id ? null : action.id;
        }

        action.onClick?.(context);
        refresh();
      });

      toolbar.append(button);

      if (openPanelActionId === action.id && action.renderPanel) {
        activePanel = action.renderPanel(context);
      }
    }

    if (activePanel) {
      popover.append(activePanel);
    }
  };

  const syncOverlay = () => {
    const selection = getSelection(graphCanvas);
    const selectionBounds = getSelectionBounds(selection);

    if (!selectionBounds) {
      overlay.hidden = true;
      closePanel();
      toolbar.replaceChildren();
      popover.querySelector(".litegraph-selection-addon__panel")?.remove();
      renderSignature = "";
      return;
    }

    overlay.hidden = false;

    const context = buildContext(selection, selectionBounds);
    renderToolbar(context);

    const screenBounds = projectToScreen(graphCanvas, host, selectionBounds);
    const outlinedBounds = expandScreenBounds(screenBounds, SELECTION_OUTLINE_PADDING);

    outline.hidden = selection.length <= 1;
    outline.style.left = `${outlinedBounds.x}px`;
    outline.style.top = `${outlinedBounds.y}px`;
    outline.style.width = `${Math.max(outlinedBounds.width, 1)}px`;
    outline.style.height = `${Math.max(outlinedBounds.height, 1)}px`;

    const targetX = screenBounds.x + screenBounds.width / 2;
    const targetY = screenBounds.y - POPOVER_OFFSET;
    const popoverWidth = popover.offsetWidth;
    const popoverHeight = popover.offsetHeight;
    const halfWidth = popoverWidth / 2;

    const left = clamp(
      targetX,
      halfWidth + POPOVER_EDGE_PADDING,
      host.clientWidth - halfWidth - POPOVER_EDGE_PADDING,
    );
    const top = clamp(
      targetY,
      popoverHeight + POPOVER_EDGE_PADDING,
      host.clientHeight - POPOVER_EDGE_PADDING,
    );

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.transform = "translate(-50%, -100%)";
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof Node)) return;
    if (popover.contains(event.target)) return;
    closePanel();
    syncOverlay();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    closePanel();
    syncOverlay();
  };

  host.addEventListener("pointerdown", handlePointerDown, true);
  window.addEventListener("keydown", handleKeyDown, true);

  graphCanvas.onSelectionChange = (selected) => {
    previousOnSelectionChange?.(selected);
    syncOverlay();
  };

  graphCanvas.onDrawOverlay = (ctx) => {
    previousOnDrawOverlay?.(ctx);
    syncOverlay();
  };

  syncOverlay();

  return () => {
    resizeObserver.disconnect();
    host.removeEventListener("pointerdown", handlePointerDown, true);
    window.removeEventListener("keydown", handleKeyDown, true);
    graphCanvas.onSelectionChange = previousOnSelectionChange;
    graphCanvas.onDrawOverlay = previousOnDrawOverlay;
    overlay.remove();
  };
}

function getSelection(graphCanvas: LGraphCanvas): Positionable[] {
  const selectedItems = Array.from(graphCanvas.selectedItems ?? []);
  if (selectedItems.length > 0) return selectedItems;
  return Object.values(graphCanvas.selected_nodes ?? {});
}

function getSelectionBounds(selection: readonly Positionable[]): SelectionBounds | null {
  if (!selection.length) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const item of selection) {
    const [x, y, width, height] = item.boundingRect;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      continue;
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function projectToScreen(
  graphCanvas: LGraphCanvas,
  host: HTMLElement,
  selectionBounds: SelectionBounds,
): ScreenBounds {
  const [left, top] = graphCanvas.convertOffsetToCanvas([selectionBounds.x, selectionBounds.y]);
  const [right, bottom] = graphCanvas.convertOffsetToCanvas([
    selectionBounds.x + selectionBounds.width,
    selectionBounds.y + selectionBounds.height,
  ]);

  const canvasRect = graphCanvas.canvas.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();

  return {
    x: canvasRect.left - hostRect.left + Math.min(left, right),
    y: canvasRect.top - hostRect.top + Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  };
}

function expandScreenBounds(bounds: ScreenBounds, padding: number): ScreenBounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function createRenderSignature(context: SelectionToolbarContext, openPanelActionId: string | null) {
  const ids = context.selection.map((item) => String(item.id)).join(",");
  const colors = context.colorableSelection
    .map((item) => colorSignature(item.getColorOption()))
    .join("|");

  return `${ids}::${colors}::${openPanelActionId ?? ""}`;
}

function colorSignature(colorOption: ColorOption | null) {
  if (!colorOption) return "default";
  return `${colorOption.color}/${colorOption.bgcolor}/${colorOption.groupcolor}`;
}

function clamp(value: number, min: number, max: number) {
  if (min > max) return value;
  return Math.min(Math.max(value, min), max);
}

function stopEventPropagation(element: HTMLElement) {
  const stopPropagation = (event: Event) => {
    event.stopPropagation();
  };

  for (const eventName of [
    "pointerdown",
    "mousedown",
    "click",
    "dblclick",
    "contextmenu",
    "wheel",
  ]) {
    element.addEventListener(eventName, stopPropagation);
  }
}
