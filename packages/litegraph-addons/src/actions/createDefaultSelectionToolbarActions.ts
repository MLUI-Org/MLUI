import type { SelectionToolbarAction } from "../types";
import { createColorSelectionAction } from "./createColorSelectionAction";
import { createCodeSelectionAction } from "./createCodeSelectionAction";
import { createDeleteSelectionAction } from "./createDeleteSelectionAction";

export function createDefaultSelectionToolbarActions(): SelectionToolbarAction[] {
  return [createDeleteSelectionAction(), createCodeSelectionAction(), createColorSelectionAction()];
}
