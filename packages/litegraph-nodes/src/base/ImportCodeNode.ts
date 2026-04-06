import { CodeEnabledNode } from "./CodeEnabledNode";
import type { CodeEnabledNodeOptions, CodeNodeProperties } from "../types";

export interface ImportCodeNodeProperties extends CodeNodeProperties {
  importError?: string;
}

export abstract class ImportCodeNode<
  TProperties extends ImportCodeNodeProperties = ImportCodeNodeProperties,
> extends CodeEnabledNode<TProperties> {
  protected constructor(options: CodeEnabledNodeOptions<TProperties>) {
    super(options);
    this.validateImports({
      reportErrors: false,
    });
  }

  override updateCode(value: string): boolean {
    const changed = super.updateCode(value);
    if (changed && !this.isCodeModeEnabled()) {
      this.validateImports({
        reportErrors: true,
      });
    }
    return changed;
  }

  protected override onCodeModeChanged(enabled: boolean) {
    if (!enabled) {
      this.validateImports({
        reportErrors: true,
      });
    }
  }

  validateImports({ reportErrors = true }: { reportErrors?: boolean } = {}) {
    const invalidLine = this.code
      .split(/\r?\n/)
      .map((line, index) => ({
        index: index + 1,
        line,
      }))
      .find(({ line }) => !isValidImportLine(line));

    if (invalidLine) {
      if (reportErrors) {
        this.has_errors = true;
        this.properties.importError =
          `Import node line ${invalidLine.index} must be an import, alias, comment, or blank line.` as TProperties["importError"];
      }
      return false;
    }

    this.has_errors = false;
    this.properties.importError = undefined as TProperties["importError"];
    return true;
  }
}

export function isImportCodeNode(value: unknown): value is ImportCodeNode {
  return value instanceof ImportCodeNode;
}

function isValidImportLine(line: string) {
  const trimmed = line.trim();
  return (
    !trimmed ||
    trimmed.startsWith("#") ||
    /^import\s+[A-Za-z_][A-Za-z0-9_.,\s]*(\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?$/.test(trimmed) ||
    /^from\s+[A-Za-z_][A-Za-z0-9_.]*\s+import\s+.+$/.test(trimmed) ||
    /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*[A-Za-z_][A-Za-z0-9_.]*$/.test(trimmed)
  );
}
