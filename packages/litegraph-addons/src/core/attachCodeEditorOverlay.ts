import type { LGraphCanvas, LGraphNode } from "@mlui/litegraph";
import { isCodeEnabledNode, type CodeEnabledNodeLike } from "@mlui/litegraph-nodes";

const NODE_PANEL_PADDING = 12;
const BASE_FONT_SIZE = 12;
const BASE_LINE_HEIGHT = 1.5;

interface AttachCodeEditorOverlayOptions {
  graphCanvas: LGraphCanvas;
  host: HTMLElement;
}

interface EditorEntry {
  container: HTMLDivElement;
  surface: HTMLDivElement;
  syntaxLayer: HTMLPreElement;
  textarea: HTMLTextAreaElement;
  node: CodeEnabledNodeLike;
  nodeId: string;
  lastSyncedCode: string;
}

export function attachCodeEditorOverlay({
  graphCanvas,
  host,
}: AttachCodeEditorOverlayOptions): () => void {
  const overlay = document.createElement("div");
  overlay.className = "litegraph-code-addon";
  overlay.hidden = true;
  host.append(overlay);

  const editors = new Map<string, EditorEntry>();
  const previousOnDrawOverlay = graphCanvas.onDrawOverlay;
  const resizeObserver = new ResizeObserver(() => {
    scheduleSync();
  });
  resizeObserver.observe(host);

  let frameId = 0;

  const scheduleSync = () => {
    if (frameId !== 0) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      syncEditors();
    });
  };

  const syncEditors = () => {
    const activeNodes = getActiveCodeNodes(graphCanvas);
    overlay.hidden = activeNodes.length === 0;

    const activeIds = new Set(activeNodes.map((node) => String(node.id)));
    for (const [nodeId, entry] of editors) {
      if (activeIds.has(nodeId)) continue;
      entry.container.remove();
      editors.delete(nodeId);
    }

    for (const node of activeNodes) {
      const nodeId = String(node.id);
      const existingEntry = editors.get(nodeId);
      const entry =
        existingEntry && existingEntry.node === node ? existingEntry : createEditorEntry(node);

      if (existingEntry && existingEntry.node !== node) {
        existingEntry.container.remove();
        editors.delete(nodeId);
      }

      if (!editors.has(nodeId)) {
        editors.set(nodeId, entry);
        overlay.append(entry.container);
      }

      syncEditorContent(entry, node);
      syncEditorLayout(entry, node, graphCanvas, host);
    }
  };

  graphCanvas.onDrawOverlay = (ctx) => {
    previousOnDrawOverlay?.(ctx);
    scheduleSync();
  };

  scheduleSync();

  return () => {
    resizeObserver.disconnect();
    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
    }
    graphCanvas.onDrawOverlay = previousOnDrawOverlay;
    editors.clear();
    overlay.remove();
  };
}

function getActiveCodeNodes(graphCanvas: LGraphCanvas): CodeEnabledNodeLike[] {
  const graph = graphCanvas.graph;
  if (!graph) return [];

  return graph.nodes.filter(
    (node): node is CodeEnabledNodeLike => isCodeEnabledNode(node) && node.isCodeModeEnabled(),
  );
}

function createEditorEntry(node: CodeEnabledNodeLike): EditorEntry {
  const container = document.createElement("div");
  container.className = "litegraph-code-addon__editor";

  const surface = document.createElement("div");
  surface.className = "litegraph-code-addon__surface";

  const syntaxLayer = document.createElement("pre");
  syntaxLayer.className = "litegraph-code-addon__syntax";
  syntaxLayer.setAttribute("aria-hidden", "true");

  const textarea = document.createElement("textarea");
  textarea.className = "litegraph-code-addon__textarea";
  textarea.spellcheck = false;
  textarea.wrap = "off";
  textarea.setAttribute("aria-label", `${node.title || "Code"} editor`);

  stopEventPropagation(surface);
  surface.append(syntaxLayer, textarea);
  container.append(surface);

  const entry: EditorEntry = {
    container,
    surface,
    syntaxLayer,
    textarea,
    node,
    nodeId: String(node.id),
    lastSyncedCode: "",
  };

  textarea.addEventListener("input", () => {
    const value = textarea.value;
    if (node.updateCode(value)) {
      entry.lastSyncedCode = value;
    }
    syncSyntaxLayer(entry, value);
  });

  textarea.addEventListener("scroll", () => {
    syntaxLayer.scrollTop = textarea.scrollTop;
    syntaxLayer.scrollLeft = textarea.scrollLeft;
  });

  textarea.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });

  textarea.addEventListener("focus", () => {
    container.dataset.focused = "true";
  });

  textarea.addEventListener("blur", () => {
    container.dataset.focused = "false";
    maybeResolveCodeEntryPoint(node);
  });

  syncEditorContent(entry, node);
  return entry;
}

function maybeResolveCodeEntryPoint(node: CodeEnabledNodeLike) {
  const typedNode = node as unknown as {
    resolveCodeEntryPoint?: (options?: {
      reportErrors?: boolean;
      validateGlobals?: boolean;
    }) => boolean;
    validateImports?: (options?: { reportErrors?: boolean }) => boolean;
  };
  const resolver = typedNode.resolveCodeEntryPoint;

  resolver?.call(node, {
    reportErrors: true,
    validateGlobals: true,
  });
  typedNode.validateImports?.call(node, {
    reportErrors: true,
  });
}

function syncEditorContent(entry: EditorEntry, node: CodeEnabledNodeLike) {
  const nextCode = node.code;
  if (entry.lastSyncedCode === nextCode && entry.textarea.value === nextCode) return;

  const isFocused = document.activeElement === entry.textarea;
  if (!isFocused) {
    entry.textarea.value = nextCode;
  } else if (entry.textarea.value !== nextCode) {
    entry.textarea.value = nextCode;
  }

  entry.lastSyncedCode = nextCode;
  syncSyntaxLayer(entry, nextCode);
}

function syncSyntaxLayer(entry: EditorEntry, value: string) {
  entry.syntaxLayer.innerHTML = highlightPython(value);
}

function syncEditorLayout(
  entry: EditorEntry,
  node: LGraphNode,
  graphCanvas: LGraphCanvas,
  host: HTMLElement,
) {
  const scale = graphCanvas.ds.scale;
  const inset = Math.max(NODE_PANEL_PADDING * scale, 6);
  const fontSize = Math.max(BASE_FONT_SIZE * scale, 9);
  const borderRadius = Math.max(12 * scale, 8);

  const [left, top] = graphCanvas.convertOffsetToCanvas(node.pos);
  const [right, bottom] = graphCanvas.convertOffsetToCanvas([
    node.pos[0] + node.size[0],
    node.pos[1] + node.size[1],
  ]);

  const canvasRect = graphCanvas.canvas.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();

  const x = canvasRect.left - hostRect.left + Math.min(left, right);
  const y = canvasRect.top - hostRect.top + Math.min(top, bottom);
  const width = Math.abs(right - left);
  const height = Math.abs(bottom - top);

  const insetX = Math.min(inset, width / 2);
  const insetY = Math.min(inset, height / 2);
  const innerWidth = Math.max(width - insetX * 2, 0);
  const innerHeight = Math.max(height - insetY * 2, 0);

  entry.container.style.left = `${x + insetX}px`;
  entry.container.style.top = `${y + insetY}px`;
  entry.container.style.width = `${innerWidth}px`;
  entry.container.style.height = `${innerHeight}px`;
  entry.container.style.fontSize = `${fontSize}px`;
  entry.surface.style.borderRadius = `${borderRadius}px`;
  entry.surface.style.setProperty("--litegraph-code-line-height", String(BASE_LINE_HEIGHT));
}

function highlightPython(code: string): string {
  if (!code) return "";

  let index = 0;
  let html = "";
  let pendingDefinitionName = false;

  while (index < code.length) {
    const char = code[index];
    const tripleQuote = code.slice(index, index + 3);

    if (tripleQuote === "'''" || tripleQuote === "\"\"\"") {
      const endIndex = findClosingTripleQuote(code, index + 3, tripleQuote);
      html += wrapToken("string", code.slice(index, endIndex));
      index = endIndex;
      pendingDefinitionName = false;
      continue;
    }

    if (char === "'" || char === "\"") {
      const endIndex = findClosingString(code, index + 1, char);
      html += wrapToken("string", code.slice(index, endIndex));
      index = endIndex;
      pendingDefinitionName = false;
      continue;
    }

    if (char === "#") {
      const endIndex = findLineEnd(code, index);
      html += wrapToken("comment", code.slice(index, endIndex));
      index = endIndex;
      pendingDefinitionName = false;
      continue;
    }

    if (char === "@" && isIdentifierStart(code[index + 1] ?? "")) {
      const endIndex = readIdentifier(code, index + 1);
      html += wrapToken("decorator", code.slice(index, endIndex));
      index = endIndex;
      pendingDefinitionName = false;
      continue;
    }

    if (isIdentifierStart(char)) {
      const endIndex = readIdentifier(code, index);
      const word = code.slice(index, endIndex);

      if (pendingDefinitionName) {
        html += wrapToken("definition", word);
        pendingDefinitionName = false;
      } else if (PYTHON_KEYWORDS.has(word)) {
        html += wrapToken("keyword", word);
        pendingDefinitionName = word === "def" || word === "class";
      } else if (PYTHON_CONSTANTS.has(word)) {
        html += wrapToken("constant", word);
      } else if (PYTHON_BUILTINS.has(word)) {
        html += wrapToken("builtin", word);
      } else {
        html += escapeHtml(word);
      }

      index = endIndex;
      continue;
    }

    if (isNumberStart(code, index)) {
      const endIndex = readNumber(code, index);
      html += wrapToken("number", code.slice(index, endIndex));
      index = endIndex;
      pendingDefinitionName = false;
      continue;
    }

    if (PYTHON_OPERATORS.has(char)) {
      html += wrapToken("operator", char);
      index += 1;
      pendingDefinitionName = false;
      continue;
    }

    html += escapeHtml(char);
    if (!/\s/.test(char)) {
      pendingDefinitionName = false;
    }
    index += 1;
  }

  return html;
}

function wrapToken(type: string, value: string) {
  return `<span class="litegraph-code-addon__token litegraph-code-addon__token--${type}">${escapeHtml(
    value,
  )}</span>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function findClosingTripleQuote(code: string, startIndex: number, quote: string) {
  const endIndex = code.indexOf(quote, startIndex);
  return endIndex === -1 ? code.length : endIndex + 3;
}

function findClosingString(code: string, startIndex: number, quote: string) {
  let index = startIndex;
  while (index < code.length) {
    if (code[index] === "\\") {
      index += 2;
      continue;
    }
    if (code[index] === quote) {
      return index + 1;
    }
    index += 1;
  }
  return code.length;
}

function findLineEnd(code: string, startIndex: number) {
  const newlineIndex = code.indexOf("\n", startIndex);
  return newlineIndex === -1 ? code.length : newlineIndex;
}

function isIdentifierStart(char: string) {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string) {
  return /[A-Za-z0-9_]/.test(char);
}

function readIdentifier(code: string, startIndex: number) {
  let index = startIndex;
  while (index < code.length && isIdentifierPart(code[index])) {
    index += 1;
  }
  return index;
}

function isNumberStart(code: string, index: number) {
  const char = code[index];
  if (!/\d/.test(char)) return false;

  const previous = code[index - 1];
  return previous == null || !isIdentifierPart(previous);
}

function readNumber(code: string, startIndex: number) {
  let index = startIndex;
  while (index < code.length && /[\d._xobA-Fa-f]/.test(code[index])) {
    index += 1;
  }
  return index;
}

function stopEventPropagation(element: HTMLElement) {
  const stopPropagation = (event: Event) => {
    event.stopPropagation();
  };

  for (const eventName of [
    "pointerdown",
    "mousedown",
    "mouseup",
    "click",
    "dblclick",
    "contextmenu",
    "wheel",
  ]) {
    element.addEventListener(eventName, stopPropagation);
  }
}

const PYTHON_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "case",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "match",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const PYTHON_CONSTANTS = new Set(["False", "None", "True"]);

const PYTHON_BUILTINS = new Set([
  "dict",
  "enumerate",
  "float",
  "int",
  "len",
  "list",
  "map",
  "max",
  "min",
  "print",
  "range",
  "set",
  "str",
  "sum",
  "tuple",
]);

const PYTHON_OPERATORS = new Set([
  "=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "!",
  "|",
  "&",
  "^",
  "~",
  ":",
]);
