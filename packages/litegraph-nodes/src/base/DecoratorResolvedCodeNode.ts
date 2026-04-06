import {
  type INodeInputSlot,
  type INodeOutputSlot,
  type ISlotType,
  type LGraph,
  LiteGraph,
} from "@mlui/litegraph";

import { CodeEnabledNode } from "./CodeEnabledNode";
import { resolveEntryDefinition, type EntryDefinition } from "../type-system/entryResolver";
import {
  ensureResolvedTypeSystemInstalled,
  formatRuntimeType,
  isRuntimeTypeAssignable,
  type RuntimePort,
} from "../type-system/runtimeTypes";
import type { CodeEnabledNodeOptions, CodeNodeProperties } from "../types";

export interface DecoratorResolvedCodeNodeProperties extends CodeNodeProperties {
  entryError?: string;
}

export interface DecoratorResolvedCodeNodeOptions<
  TProperties extends DecoratorResolvedCodeNodeProperties,
> extends CodeEnabledNodeOptions<TProperties> {
  entryKind?: "function" | "class" | "class-method";
  ownerClassName?: string;
}

export abstract class DecoratorResolvedCodeNode<
  TProperties extends DecoratorResolvedCodeNodeProperties = DecoratorResolvedCodeNodeProperties,
> extends CodeEnabledNode<TProperties> {
  private entryDefinition?: EntryDefinition;
  private readonly entryKind: "function" | "class" | "class-method";
  private readonly classOwnerName?: string;

  protected constructor(options: DecoratorResolvedCodeNodeOptions<TProperties>) {
    ensureResolvedTypeSystemInstalled();
    super(options);
    this.entryKind = options.entryKind ?? "function";
    this.classOwnerName = options.ownerClassName;
    this.resolveCodeEntryPoint({
      reportErrors: false,
      validateGlobals: false,
    });
  }

  get resolvedEntryDefinition() {
    return this.entryDefinition;
  }

  get resolvedEntryKind() {
    return this.entryDefinition?.kind ?? this.entryKind;
  }

  get ownerClassName() {
    return this.classOwnerName;
  }

  override updateCode(value: string): boolean {
    const changed = super.updateCode(value);
    if (changed && !this.isCodeModeEnabled()) {
      this.resolveCodeEntryPoint({
        reportErrors: true,
        validateGlobals: true,
      });
    }
    return changed;
  }

  protected override onCodeModeChanged(enabled: boolean) {
    if (!enabled) {
      this.resolveCodeEntryPoint({
        reportErrors: true,
        validateGlobals: true,
      });
    }
  }

  override onAdded(_graph: LGraph) {
    this.resolveCodeEntryPoint({
      reportErrors: false,
      validateGlobals: true,
    });
    this.resolvePeerCodeEntries();
  }

  resolveCodeEntryPoint({
    reportErrors = true,
    validateGlobals = true,
  }: {
    reportErrors?: boolean;
    validateGlobals?: boolean;
  } = {}): boolean {
    const resolution = resolveEntryDefinition(this.code, {
      kind: this.entryKind,
    });
    if (resolution.ok === false) {
      this.entryDefinition = undefined;
      this.reportResolutionError(resolution.error, reportErrors);
      this.requestCanvasRedraw();
      return false;
    }

    let definition = resolution.definition;
    if (validateGlobals) {
      const globalsResolution = this.resolveGlobalInputs(definition);
      if (globalsResolution.ok === false) {
        this.entryDefinition = definition;
        this.reportResolutionError(globalsResolution.error, reportErrors);
        this.requestCanvasRedraw();
        return false;
      }
      definition = globalsResolution.definition;
    }

    this.entryDefinition = definition;
    this.has_errors = false;
    this.setEntryError(undefined);
    this.syncRuntimeValueWidgets(definition.globalOutputs, "global");
    this.syncRuntimeSlots(runtimeInputPorts(definition), runtimeOutputPorts(definition));
    this.requestCanvasRedraw();
    this.graph?.change();
    return true;
  }

  override onDrawForeground(ctx: CanvasRenderingContext2D): void {
    super.onDrawForeground(ctx);
    this.drawEntryKindBadge(ctx);
  }

  private syncRuntimeSlots(inputs: RuntimePort[], outputs: RuntimePort[]) {
    const nextInputTypes = inputs.map((port) => formatRuntimeType(port.type));
    const nextOutputTypes = outputs.map((port) => formatRuntimeType(port.type));

    if (
      areSlotsEquivalent(this.inputs, inputs, nextInputTypes) &&
      areSlotsEquivalent(this.outputs, outputs, nextOutputTypes)
    ) {
      return;
    }

    while (this.inputs.length > 0) {
      this.removeInput(this.inputs.length - 1);
    }

    while (this.outputs.length > 0) {
      this.removeOutput(this.outputs.length - 1);
    }

    for (const [index, port] of inputs.entries()) {
      this.addInput(port.name, nextInputTypes[index]);
    }

    for (const [index, port] of outputs.entries()) {
      this.addOutput(port.name, nextOutputTypes[index]);
    }
  }

  private setEntryError(value: string | undefined) {
    this.properties.entryError = value as TProperties["entryError"];
  }

  private syncRuntimeValueWidgets(ports: RuntimePort[], kind: "field" | "global") {
    if (ports.length > 0) {
      this.serialize_widgets = true;
    }

    const propertyPrefix = `${kind}_`;
    const managedWidgetNames = new Set(ports.map((port) => runtimeValuePropertyName(port, kind)));
    this.widgets =
      this.widgets?.filter(
        (widget) =>
          !(typeof widget.options?.property === "string" && widget.options.property.startsWith(propertyPrefix)) ||
          managedWidgetNames.has(widget.options.property),
      ) ?? [];

    for (const port of ports) {
      const propertyName = runtimeValuePropertyName(port, kind);
      const initialValue =
        this.properties[propertyName] ?? parseGlobalDefaultValue(port.defaultValue);
      this.properties[propertyName] = initialValue;

      const existingWidget = this.widgets.find((widget) => widget.options?.property === propertyName);
      if (existingWidget) {
        existingWidget.value = initialValue as typeof existingWidget.value;
        continue;
      }

      const widgetType = typeof initialValue === "number" ? "number" : "string";
      const widget = (this as unknown as {
        addWidget(
          type: "number" | "string",
          name: string,
          value: number | string,
          callback: ((value: number | string) => void) | null,
          options: { property: string; precision?: number; step2?: number },
        ): unknown;
      }).addWidget(
        widgetType,
        port.name,
        initialValue as number | string,
        (value) => {
          this.properties[propertyName] = value;
          this.graph?.change();
        },
        {
          property: propertyName,
          precision: 6,
          step2: 0.001,
        },
      );

      if (widget && typeof widget === "object") {
        Object.assign(widget, {
          serialize: true,
        });
      }
    }
  }

  private drawEntryKindBadge(ctx: CanvasRenderingContext2D) {
    const label = entryKindLabel(this.resolvedEntryKind);
    const node = this as unknown as { size?: [number, number] };
    const width = node.size?.[0] ?? 180;

    ctx.save();
    ctx.font = "10px Consolas, 'Courier New', monospace";
    ctx.textBaseline = "middle";

    const textWidth = ctx.measureText(label).width;
    const badgeWidth = Math.ceil(textWidth + 14);
    const badgeHeight = 16;
    const x = Math.max(8, width - badgeWidth - 8);
    const y = -LiteGraph.NODE_TITLE_HEIGHT + (LiteGraph.NODE_TITLE_HEIGHT - badgeHeight) / 2;

    ctx.fillStyle = entryKindBadgeColor(this.resolvedEntryKind);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, badgeWidth, badgeHeight, [8]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
    ctx.fillText(label, x + 7, y + badgeHeight / 2);
    ctx.restore();
  }

  private reportResolutionError(value: string, reportErrors: boolean) {
    if (!reportErrors) return;

    this.has_errors = true;
    this.setEntryError(value);
  }

  private resolveGlobalInputs(definition: EntryDefinition):
    | {
        ok: true;
        definition: EntryDefinition;
      }
    | {
        ok: false;
        error: string;
      } {
    if (definition.globalInputs.length === 0) {
      return {
        ok: true,
        definition,
      };
    }

    if (!this.graph) {
      return {
        ok: false,
        error: "Global inputs require the node to be in a graph.",
      };
    }

    const globalOutputs = collectGraphGlobalOutputs(this.graph);
    const linkedClassFields = collectLinkedClassFields(this.graph, this);
    const resolvedGlobalInputs = [];

    for (const globalInput of definition.globalInputs) {
      const matches =
        linkedClassFields.get(globalInput.sourceName) ??
        globalOutputs.get(globalInput.sourceName) ??
        [];
      if (matches.length === 0) {
        return {
          ok: false,
          error: `Global input "${globalInput.name}" references missing outputglobal_${globalInput.sourceName}.`,
        };
      }

      if (matches.length > 1) {
        return {
          ok: false,
          error: `Global input "${globalInput.name}" references ambiguous outputglobal_${globalInput.sourceName}.`,
        };
      }

      const [match] = matches;
      if (
        globalInput.annotation &&
        !isRuntimeTypeAssignable(globalInput.annotation, match.type) &&
        !isRuntimeTypeAssignable(match.type, globalInput.annotation)
      ) {
        return {
          ok: false,
          error: `Global input "${globalInput.name}" does not match outputglobal_${globalInput.sourceName}.`,
        };
      }

      resolvedGlobalInputs.push({
        ...globalInput,
        type: match.type,
      });
    }

    return {
      ok: true,
      definition: {
        ...definition,
        globalInputs: resolvedGlobalInputs,
      },
    };
  }

  private resolvePeerCodeEntries() {
    if (!this.graph) return;

    for (const node of this.graph.nodes) {
      if (node === this || !(node instanceof DecoratorResolvedCodeNode)) continue;
      node.resolveCodeEntryPoint({
        reportErrors: false,
        validateGlobals: true,
      });
    }
  }
}

function collectLinkedClassFields(graph: LGraph, node: DecoratorResolvedCodeNode) {
  const fields = new Map<string, RuntimePort[]>();

  for (const input of node.inputs) {
    const link = graph.getLink(input.link);
    const originNode = link ? graph.getNodeById(link.origin_id) : undefined;
    if (!(originNode instanceof DecoratorResolvedCodeNode)) continue;
    if (originNode.resolvedEntryDefinition?.kind !== "class") continue;

    for (const field of originNode.resolvedEntryDefinition.fields) {
      const matches = fields.get(field.name) ?? [];
      matches.push(field);
      fields.set(field.name, matches);
    }
  }

  return fields;
}

function areSlotsEquivalent(
  currentSlots: Array<INodeInputSlot | INodeOutputSlot>,
  nextPorts: RuntimePort[],
  nextTypes: ISlotType[],
) {
  if (currentSlots.length !== nextPorts.length) return false;

  return currentSlots.every(
    (slot, index) => slot.name === nextPorts[index].name && slot.type === nextTypes[index],
  );
}

function collectGraphGlobalOutputs(graph: LGraph) {
  const outputs = new Map<string, RuntimePort[]>();

  for (const node of graph.nodes) {
    if (!(node instanceof DecoratorResolvedCodeNode)) continue;

    for (const globalOutput of node.resolvedEntryDefinition?.globalOutputs ?? []) {
      const matches = outputs.get(globalOutput.name) ?? [];
      matches.push(globalOutput);
      outputs.set(globalOutput.name, matches);
    }
  }

  return outputs;
}

export function globalWidgetPropertyName(port: Pick<RuntimePort, "name">) {
  return runtimeValuePropertyName(port, "global");
}

function runtimeValuePropertyName(port: Pick<RuntimePort, "name">, kind: "field" | "global") {
  return `${kind}_${port.name}`;
}

export function parseGlobalDefaultValue(value: string | undefined): number | string {
  if (!value) return "";

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;

  const stringMatch = /^(['"])(.*)\1$/.exec(value);
  return stringMatch?.[2] ?? value;
}

function runtimeInputPorts(definition: EntryDefinition) {
  if (definition.kind === "class") return definition.fields;
  if (definition.kind === "class-method") {
    return definition.inputs.filter((input) => input.name === "self");
  }
  return definition.inputs;
}

function runtimeOutputPorts(definition: EntryDefinition) {
  if (definition.kind === "class-method") return [];
  if (definition.kind === "class") {
    const className = definition.className ?? definition.functionName;
    return [
      ...definition.outputs,
      {
        name: "chain",
        type: {
          kind: "apply",
          name: "ClassChain",
          args: [
            {
              kind: "named",
              name: className,
            },
          ],
        },
      } satisfies RuntimePort,
    ];
  }
  return definition.outputs;
}

function entryKindLabel(kind: EntryDefinition["kind"]) {
  return kind === "class-method" ? "method" : kind;
}

function entryKindBadgeColor(kind: EntryDefinition["kind"]) {
  switch (kind) {
    case "class":
      return "rgba(20, 83, 45, 0.9)";
    case "class-method":
      return "rgba(30, 64, 175, 0.9)";
    case "function":
      return "rgba(120, 53, 15, 0.9)";
  }
}
