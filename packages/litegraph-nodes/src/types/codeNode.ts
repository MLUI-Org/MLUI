import type { LGraphNode } from "@mlui/litegraph";

export type NodeSize = [width: number, height: number];

export interface CodeNodeProperties extends Record<string, unknown> {
  code: string;
}

export interface CodeEnabledNodeLike extends LGraphNode {
  readonly code: string;
  updateCode(value: string): boolean;
  isCodeModeEnabled(): boolean;
  setCodeMode(enabled: boolean): boolean;
  toggleCodeMode(force?: boolean): boolean;
}

export interface CodeEnabledNodeOptions<TProperties extends CodeNodeProperties> {
  title: string;
  type?: string;
  code?: string;
  normalSize?: NodeSize;
  codeSize?: NodeSize;
  properties?: Partial<TProperties>;
}
