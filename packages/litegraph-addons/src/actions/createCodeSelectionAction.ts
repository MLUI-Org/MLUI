import { isCodeEnabledNode } from "@mlui/litegraph-nodes";

import type { SelectionToolbarAction } from "../types";

const codeIconUrl = new URL("../../assets/code_icon.webp", import.meta.url).href;

export function createCodeSelectionAction(): SelectionToolbarAction {
  return {
    id: "code",
    label: "Toggle code view",
    isActive: ({ selection }) => {
      const codeNodes = selection.filter(isCodeEnabledNode);
      return codeNodes.length > 0 && codeNodes.every((node) => node.isCodeModeEnabled());
    },
    isDisabled: ({ selection }) => selection.every((item) => !isCodeEnabledNode(item)),
    renderButtonContent: () =>
      `<img class="litegraph-selection-addon__icon-image" src="${codeIconUrl}" alt="" aria-hidden="true" />`,
    onClick: ({ selection }) => {
      const codeNodes = selection.filter(isCodeEnabledNode);
      if (!codeNodes.length) return;

      const shouldEnableCodeMode = codeNodes.some((node) => !node.isCodeModeEnabled());
      for (const node of codeNodes) {
        node.setCodeMode(shouldEnableCodeMode);
      }
    },
  };
}
