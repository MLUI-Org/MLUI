import { LGraphCanvas, type ColorOption } from "@mlui/litegraph";

import type { SelectionToolbarAction, SelectionToolbarColorableItem } from "../types";

export function createColorSelectionAction(): SelectionToolbarAction {
  return {
    id: "color",
    label: "Change color",
    buttonClassName: "litegraph-selection-addon__color-button",
    isDisabled: ({ colorableSelection }) => colorableSelection.length === 0,
    renderButtonContent: (context) => {
      const currentColor = getCurrentSelectionColor(context.colorableSelection);
      const isMixed = currentColor === "mixed";
      const swatchColor =
        currentColor === "default" || currentColor === "mixed" ? "#7c3aed" : currentColor.color;

      return `
        <span class="litegraph-selection-addon__swatch" data-mixed="${String(isMixed)}" style="--litegraph-selection-swatch: ${swatchColor};"></span>
        <svg class="litegraph-selection-addon__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m7 10 5 5 5-5" />
        </svg>
      `;
    },
    renderPanel: (context) => {
      const panel = document.createElement("div");
      panel.className = "litegraph-selection-addon__panel";

      const currentColor = getCurrentSelectionColor(context.colorableSelection);

      const clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = "litegraph-selection-addon__panel-button";
      clearButton.dataset.clear = "true";
      clearButton.dataset.current = String(currentColor === "default");
      clearButton.title = "Reset color";
      clearButton.setAttribute("aria-label", "Reset color");
      clearButton.addEventListener("click", () => {
        applyColor(context.colorableSelection, null);
        context.closePanel();
        context.refresh();
      });
      panel.append(clearButton);

      for (const [name, colorOption] of Object.entries(LGraphCanvas.node_colors)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "litegraph-selection-addon__panel-button";
        button.title = name;
        button.setAttribute("aria-label", name);
        button.dataset.current = String(
          currentColor !== "default" &&
            currentColor !== "mixed" &&
            sameColorOption(currentColor, colorOption),
        );
        button.innerHTML = `
          <span class="litegraph-selection-addon__panel-swatch" style="--litegraph-selection-swatch: ${colorOption.color};"></span>
        `;
        button.addEventListener("click", () => {
          applyColor(context.colorableSelection, colorOption);
          context.closePanel();
          context.refresh();
        });
        panel.append(button);
      }

      stopEventPropagation(panel);
      return panel;
    },
  };
}

function applyColor(
  selection: readonly SelectionToolbarColorableItem[],
  colorOption: ColorOption | null,
) {
  for (const item of selection) {
    item.setColorOption(colorOption);
  }

  LGraphCanvas.active_canvas?.setDirty(true, true);
}

function getCurrentSelectionColor(
  selection: readonly SelectionToolbarColorableItem[],
): ColorOption | "default" | "mixed" {
  if (!selection.length) return "default";

  const [firstItem, ...rest] = selection;
  const firstColor = firstItem.getColorOption();

  for (const item of rest) {
    if (!sameColorOption(firstColor, item.getColorOption())) {
      return "mixed";
    }
  }

  return firstColor ?? "default";
}

function sameColorOption(left: ColorOption | null, right: ColorOption | null): boolean {
  if (left === right) return true;
  if (!left || !right) return left === right;

  return (
    left.color === right.color &&
    left.bgcolor === right.bgcolor &&
    left.groupcolor === right.groupcolor
  );
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
