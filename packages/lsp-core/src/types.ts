import type { FrontmatterAnalysis } from "./frontmatter-analysis.js";

export type MdzType =
  | { kind: "builtin"; name: string }
  | { kind: "ref"; name: string; args?: MdzType[] }
  | { kind: "literal"; value: string | number }
  | { kind: "link"; linkKind: "path" | "anchor" }
  | { kind: "enum"; variants: MdzType[] }
  | { kind: "tuple"; elements: MdzType[] }
  | { kind: "array"; element: MdzType }
  | { kind: "lambda"; params: string[]; returnType?: MdzType }
  | { kind: "semantic"; description: string }
  | { kind: "unknown" };

export type VariableBinding = {
  name: string;
  type: MdzType;
  source: "input" | "context" | "assignment";
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type TypeDeclaration = {
  name: string;
  type: MdzType;
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export const BUILTIN_TYPES: Record<string, MdzType> = {
  Number: { kind: "builtin", name: "Number" },
  String: { kind: "builtin", name: "String" },
  Link: { kind: "builtin", name: "Link" },
  Lambda: { kind: "builtin", name: "Lambda" },
  Expr: { kind: "builtin", name: "Expr" },
  FilePath: { kind: "builtin", name: "FilePath" }
};

export const inferTypeFromValue = (value: unknown): MdzType => {
  if (value === null || value === undefined) {
    return { kind: "unknown" };
  }

  if (typeof value === "number") {
    return BUILTIN_TYPES.Number;
  }

  if (typeof value === "string") {
    if (value.startsWith('"') && value.endsWith('"')) {
      return { kind: "literal", value: value.slice(1, -1) };
    }
    if (/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
      return BUILTIN_TYPES.Number;
    }
    return BUILTIN_TYPES.String;
  }

  if (typeof value !== "object") {
    return { kind: "unknown" };
  }

  const obj = value as Record<string, unknown>;

  if (obj.type === "number") {
    return BUILTIN_TYPES.Number;
  }

  if (obj.type === "link") {
    const linkKind = obj.kind === "anchor" ? "anchor" : "path";
    return { kind: "link", linkKind };
  }

  if (obj.type === "template" || typeof obj === "string") {
    return BUILTIN_TYPES.String;
  }

  if (obj.type === "lambda") {
    const params = Array.isArray(obj.params)
      ? obj.params.filter((p): p is string => typeof p === "string")
      : [];
    return { kind: "lambda", params };
  }

  if (obj.type === "array" && Array.isArray(obj.elements)) {
    const elements = obj.elements as unknown[];
    if (elements.length === 0) {
      return { kind: "array", element: { kind: "unknown" } };
    }
    const firstType = inferTypeFromValue(elements[0]);
    return { kind: "array", element: firstType };
  }

  if (obj.type === "tuple" && Array.isArray(obj.elements)) {
    const elements = (obj.elements as unknown[]).map(inferTypeFromValue);
    return { kind: "tuple", elements };
  }

  return { kind: "unknown" };
};

export const astValueToType = (parsedType: unknown): MdzType => {
  if (!parsedType || typeof parsedType !== "object") {
    if (typeof parsedType === "string") {
      return { kind: "semantic", description: parsedType };
    }
    return { kind: "unknown" };
  }

  const obj = parsedType as Record<string, unknown>;

  if (obj.type === "ref") {
    const name = obj.name as string;
    if (BUILTIN_TYPES[name]) {
      return BUILTIN_TYPES[name];
    }
    const args = Array.isArray(obj.args)
      ? (obj.args as unknown[]).map(astValueToType)
      : undefined;
    return { kind: "ref", name, args };
  }

  if (obj.type === "literal") {
    const val = obj.value;
    if (typeof val === "string") {
      return { kind: "literal", value: val };
    }
    if (typeof val === "number") {
      return { kind: "literal", value: val };
    }
    if (val && typeof val === "object") {
      const linkObj = val as Record<string, unknown>;
      if (linkObj.type === "link") {
        return { kind: "link", linkKind: linkObj.kind === "anchor" ? "anchor" : "path" };
      }
      if (linkObj.type === "number" && typeof linkObj.value === "number") {
        return { kind: "literal", value: linkObj.value };
      }
    }
    return { kind: "unknown" };
  }

  if (obj.type === "enum" && Array.isArray(obj.variants)) {
    const variants = (obj.variants as unknown[]).map(astValueToType);
    return { kind: "enum", variants };
  }

  if (obj.type === "tuple" && Array.isArray(obj.elements)) {
    const elements = (obj.elements as unknown[]).map(astValueToType);
    return { kind: "tuple", elements };
  }

  if (obj.type === "array") {
    const element = astValueToType(obj.element);
    return { kind: "array", element };
  }

  if (typeof obj.type === "string" && obj.type === "semantic") {
    return { kind: "semantic", description: String(obj.description ?? "") };
  }

  return { kind: "unknown" };
};

export class TypeEnvironment {
  private types = new Map<string, TypeDeclaration>();
  private variables = new Map<string, VariableBinding>();

  constructor(private parent?: TypeEnvironment) {}

  addType(decl: TypeDeclaration): void {
    this.types.set(decl.name, decl);
  }

  addVariable(binding: VariableBinding): void {
    this.variables.set(binding.name, binding);
  }

  lookupType(name: string): TypeDeclaration | undefined {
    const local = this.types.get(name);
    if (local) return local;
    return this.parent?.lookupType(name);
  }

  lookupVariable(name: string): VariableBinding | undefined {
    const local = this.variables.get(name);
    if (local) return local;
    return this.parent?.lookupVariable(name);
  }

  resolveType(typeRef: MdzType): MdzType {
    if (typeRef.kind === "ref") {
      const decl = this.lookupType(typeRef.name);
      if (decl) {
        return decl.type;
      }
    }
    return typeRef;
  }

  getLocalTypes(): TypeDeclaration[] {
    return Array.from(this.types.values());
  }

  getLocalVariables(): VariableBinding[] {
    return Array.from(this.variables.values());
  }

  getAllTypes(): TypeDeclaration[] {
    const parentTypes = this.parent?.getAllTypes() ?? [];
    return [...parentTypes, ...this.getLocalTypes()];
  }

  getAllVariables(): VariableBinding[] {
    const parentVars = this.parent?.getAllVariables() ?? [];
    const localVars = this.getLocalVariables();
    const combined = new Map<string, VariableBinding>();
    for (const v of parentVars) combined.set(v.name, v);
    for (const v of localVars) combined.set(v.name, v);
    return Array.from(combined.values());
  }

  createChild(): TypeEnvironment {
    return new TypeEnvironment(this);
  }

  static fromFrontmatter(analysis: FrontmatterAnalysis): TypeEnvironment {
    const env = new TypeEnvironment();

    for (const entry of Object.values(analysis.types)) {
      env.addType({
        name: entry.name,
        type: astValueToType(entry.value),
        location: entry.location
      });
    }

    for (const entry of Object.values(analysis.input)) {
      env.addVariable({
        name: entry.name,
        type: astValueToType(entry.value),
        source: "input",
        location: entry.location
      });
    }

    for (const entry of Object.values(analysis.context)) {
      env.addVariable({
        name: entry.name,
        type: astValueToType(entry.value),
        source: "context",
        location: entry.location
      });
    }

    return env;
  }
}
