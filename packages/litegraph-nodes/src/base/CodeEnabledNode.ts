import { LGraphNode } from "@mlui/litegraph";

import type {
  CodeEnabledNodeLike,
  CodeEnabledNodeOptions,
  CodeNodeProperties,
  NodeSize,
} from "../types";

const DEFAULT_NORMAL_VIEW_SIZE: NodeSize = [220, 120];
const CODE_PANEL_PADDING = 12;
const CODE_LINE_HEIGHT = 18;
const CODE_PREVIEW_LINE_LIMIT = 9;

type RuntimeNodeShape<TProperties extends CodeNodeProperties> = CodeEnabledNodeLike & {
  id: string | number;
  size: NodeSize;
  properties: TProperties;
  graph?: {
    change(): void;
    trigger(action: string, param: unknown): void;
  } | null;
  setProperty?: (name: string, value: unknown) => void;
  setDirtyCanvas?: (dirtyForeground?: boolean, dirtyBackground?: boolean) => void;
};

export abstract class CodeEnabledNode<TProperties extends CodeNodeProperties = CodeNodeProperties>
  extends LGraphNode
  implements CodeEnabledNodeLike
{
  private codeModeEnabled = false;

  protected constructor({
    title,
    type,
    code = "",
    normalSize = DEFAULT_NORMAL_VIEW_SIZE,
    properties,
  }: CodeEnabledNodeOptions<TProperties>) {
    super(title, type);

    const node = this.getRuntimeNode();
    node.size = cloneSize(normalSize);
    node.properties = ({
      ...(node.properties ?? {}),
      ...properties,
      code: properties?.code ?? code,
    } as unknown as typeof node.properties);
  }

  get code() {
    return String(this.getRuntimeNode().properties.code ?? "");
  }

  set code(value: string) {
    this.updateCode(value);
  }

  updateCode(value: string): boolean {
    const node = this.getRuntimeNode();
    const previousValue = String(node.properties.code ?? "");
    if (previousValue === value) return false;

    node.setProperty?.("code", value);
    node.properties.code = value as TProperties["code"];
    node.graph?.trigger("node:property:changed", {
      nodeId: node.id,
      property: "code",
      oldValue: previousValue,
      newValue: value,
    });
    node.graph?.change();
    this.requestCanvasRedraw();
    return true;
  }

  isCodeModeEnabled() {
    return this.codeModeEnabled;
  }

  setCodeMode(enabled: boolean): boolean {
    if (this.codeModeEnabled === enabled) return false;

    this.codeModeEnabled = enabled;
    this.onCodeModeChanged(enabled);
    this.requestCanvasRedraw();
    return true;
  }

  toggleCodeMode(force?: boolean): boolean {
    return this.setCodeMode(force ?? !this.codeModeEnabled);
  }

  isWidgetVisible(widget: unknown): boolean {
    if (this.codeModeEnabled) return false;
    return (
      callBaseNodeMethod<boolean>(this, "isWidgetVisible", widget) ??
      !Boolean((widget as { hidden?: boolean } | undefined)?.hidden)
    );
  }

  getLayoutWidgets(): ReturnType<LGraphNode["getLayoutWidgets"]> {
    if (this.codeModeEnabled) return [];
    return callBaseNodeMethod<ReturnType<LGraphNode["getLayoutWidgets"]>>(
      this,
      "getLayoutWidgets",
    ) ?? [];
  }

  drawSlots(ctx: CanvasRenderingContext2D, options: unknown): void {
    if (this.codeModeEnabled) return;
    callBaseNodeMethod<void>(this, "drawSlots", ctx, options);
  }

  onDrawForeground(ctx: CanvasRenderingContext2D): void {
    if (!this.codeModeEnabled) return;

    const node = this.getRuntimeNode();
    const width = Math.max(node.size[0] - CODE_PANEL_PADDING * 2, 60);
    const height = Math.max(node.size[1] - CODE_PANEL_PADDING * 2, 60);

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(CODE_PANEL_PADDING, CODE_PANEL_PADDING, width, height, [12]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
    ctx.font = "12px Consolas, 'Courier New', monospace";
    ctx.textBaseline = "top";

    const previewLines = this.code.split(/\r?\n/).slice(0, CODE_PREVIEW_LINE_LIMIT);
    for (const [index, line] of previewLines.entries()) {
      const y = CODE_PANEL_PADDING + 10 + index * CODE_LINE_HEIGHT;
      ctx.fillText(line || " ", CODE_PANEL_PADDING + 12, y);
    }

    if (previewLines.length === 0) {
      ctx.fillText("# Python", CODE_PANEL_PADDING + 12, CODE_PANEL_PADDING + 10);
    }

    ctx.restore();
  }

  protected onCodeModeChanged(_enabled: boolean): void {}

  protected getRuntimeNode(): RuntimeNodeShape<TProperties> {
    return this as unknown as RuntimeNodeShape<TProperties>;
  }

  protected requestCanvasRedraw() {
    this.getRuntimeNode().setDirtyCanvas?.(true, true);
  }
}

export function isCodeEnabledNode(value: unknown): value is CodeEnabledNodeLike {
  return (
    value instanceof LGraphNode &&
    typeof (value as CodeEnabledNodeLike).isCodeModeEnabled === "function" &&
    typeof (value as CodeEnabledNodeLike).setCodeMode === "function" &&
    typeof (value as CodeEnabledNodeLike).toggleCodeMode === "function" &&
    "code" in (value as unknown as Record<string, unknown>)
  );
}

function cloneSize([width, height]: NodeSize): NodeSize {
  return [width, height];
}

function callBaseNodeMethod<TResult>(
  target: LGraphNode,
  methodName: "drawSlots" | "getLayoutWidgets" | "isWidgetVisible",
  ...args: unknown[]
): TResult | undefined {
  const method = Reflect.get(LGraphNode.prototype, methodName) as
    | ((...params: unknown[]) => TResult)
    | undefined;

  return method?.call(target, ...args);
}
