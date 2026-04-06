import type { SelectionToolbarAction } from "../types";

function renderDeleteIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V6" />
      <path d="M18 6v12.25A1.75 1.75 0 0 1 16.25 20h-8.5A1.75 1.75 0 0 1 6 18.25V6" />
      <path d="M10 10v6" />
      <path d="M14 10v6" />
    </svg>
  `.trim();
}

export function createDeleteSelectionAction(): SelectionToolbarAction {
  return {
    id: "delete",
    label: "Delete selected",
    renderButtonContent: () => renderDeleteIcon(),
    onClick: ({ graphCanvas }) => {
      graphCanvas.deleteSelected();
    },
  };
}
