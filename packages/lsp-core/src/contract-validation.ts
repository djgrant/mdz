import type { FrontmatterAnalysis } from "./frontmatter-analysis.js";
import type { MdzType } from "./types.js";

export type ContractDiagnostic = {
  code: string;
  message: string;
  severity: "error" | "warning";
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type WithParam = {
  name: string;
  value: string;
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type ContractValidationInput = {
  withParams: WithParam[];
  targetAnalysis: FrontmatterAnalysis;
  targetPath: string;
};

export type ContractValidationResult = {
  diagnostics: ContractDiagnostic[];
};

export const validateContract = (
  input: ContractValidationInput
): ContractValidationResult => {
  const diagnostics: ContractDiagnostic[] = [];
  const { withParams, targetAnalysis, targetPath } = input;

  const requiredInputs = new Map<string, { type: MdzType; hasDefault: boolean }>();
  const allInputs = new Set<string>();

  for (const [key, entry] of Object.entries(targetAnalysis.input)) {
    const name = key.startsWith("$") ? key.slice(1) : key;
    allInputs.add(name);
    const hasDefault = entry.defaultValue !== undefined;
    requiredInputs.set(name, {
      type: entry.value as MdzType,
      hasDefault
    });
  }

  const providedParams = new Set<string>();
  for (const param of withParams) {
    const name = param.name.startsWith("$") ? param.name.slice(1) : param.name;
    providedParams.add(name);

    if (!allInputs.has(name)) {
      diagnostics.push({
        code: "MDZC0010_UNKNOWN_PARAMETER",
        message: `Unknown parameter "${param.name}" for ${targetPath}. Available: ${Array.from(allInputs).map((n) => `$${n}`).join(", ") || "none"}`,
        severity: "warning",
        location: param.location
      });
    }
  }

  for (const [name, info] of requiredInputs) {
    if (!info.hasDefault && !providedParams.has(name)) {
      diagnostics.push({
        code: "MDZC0011_MISSING_PARAMETER",
        message: `Missing required parameter "$${name}" for ${targetPath}.`,
        severity: "error"
      });
    }
  }

  return { diagnostics };
};

export const extractWithParams = (ast: unknown): Array<{
  target: string;
  params: WithParam[];
  location?: { start: { line: number; column: number }; end: { line: number; column: number } };
}> => {
  const results: Array<{
    target: string;
    params: WithParam[];
    location?: { start: { line: number; column: number }; end: { line: number; column: number } };
  }> = [];

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    const obj = node as Record<string, unknown>;

    if ((obj.type === "spawn" || obj.type === "use") && obj.with) {
      const targetObj = obj.target as Record<string, unknown> | string | undefined;
      const target = typeof targetObj === "object" && targetObj?.value
        ? String(targetObj.value)
        : typeof targetObj === "string"
          ? targetObj
          : "";

      if (Array.isArray(obj.with)) {
        const params: WithParam[] = [];
        for (const param of obj.with) {
          const p = param as Record<string, unknown>;
          if (p.name && typeof p.name === "string") {
            params.push({
              name: p.name,
              value: typeof p.value === "string" ? p.value : "",
              location: p.location as WithParam["location"]
            });
          }
        }
        if (params.length > 0) {
          results.push({
            target,
            params,
            location: obj.location as { start: { line: number; column: number }; end: { line: number; column: number } } | undefined
          });
        }
      }
    }

    for (const value of Object.values(obj)) {
      visit(value);
    }
  };

  visit(ast);
  return results;
};
