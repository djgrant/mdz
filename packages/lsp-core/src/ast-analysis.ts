import {
  TypeEnvironment,
  inferTypeFromValue,
  astValueToType,
  type VariableBinding,
  type TypeDeclaration,
  type MdzType
} from "./types.js";
import type { FrontmatterAnalysis } from "./frontmatter-analysis.js";

export type AstLocation = {
  start: { line: number; column: number };
  end: { line: number; column: number };
};

type AssignNode = {
  type: "assign";
  target: string;
  value?: unknown;
  annotatedType?: unknown;
  location?: AstLocation;
};

type TypeDeclNode = {
  type: "type";
  name: string;
  value?: unknown;
  location?: AstLocation;
};

type ForNode = {
  type: "for";
  target: string;
  iterable?: unknown;
  blocks?: unknown[];
  location?: AstLocation;
};

type BlockNode = {
  type: string;
  blocks?: unknown[];
  then?: unknown[];
  else?: unknown[];
  whens?: Array<{ blocks?: unknown[] }>;
};

const isAssignNode = (node: unknown): node is AssignNode => {
  if (!node || typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  return obj.type === "assign" && typeof obj.target === "string";
};

const isTypeDeclNode = (node: unknown): node is TypeDeclNode => {
  if (!node || typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  return obj.type === "type" && typeof obj.name === "string";
};

const isForNode = (node: unknown): node is ForNode => {
  if (!node || typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  return obj.type === "for" && typeof obj.target === "string";
};

const isBlockNode = (node: unknown): node is BlockNode => {
  if (!node || typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  return typeof obj.type === "string";
};

const inferTypeFromAssignment = (node: AssignNode): MdzType => {
  if (node.annotatedType) {
    return astValueToType(node.annotatedType);
  }
  if (node.value !== undefined) {
    return inferTypeFromValue(node.value);
  }
  return { kind: "unknown" };
};

export type ExtractedBinding = VariableBinding & {
  astNode: AssignNode | ForNode;
};

export type ExtractedTypeDecl = TypeDeclaration & {
  astNode: TypeDeclNode;
};

export type AstAnalysisResult = {
  variables: ExtractedBinding[];
  types: ExtractedTypeDecl[];
};

const visitBlocks = (
  blocks: unknown[],
  variables: ExtractedBinding[],
  types: ExtractedTypeDecl[]
): void => {
  for (const node of blocks) {
    if (isAssignNode(node)) {
      variables.push({
        name: node.target,
        type: inferTypeFromAssignment(node),
        source: "assignment",
        location: node.location,
        astNode: node
      });
      continue;
    }

    if (isTypeDeclNode(node)) {
      types.push({
        name: node.name,
        type: node.value ? astValueToType(node.value) : { kind: "unknown" },
        location: node.location,
        astNode: node
      });
      continue;
    }

    if (isForNode(node)) {
      variables.push({
        name: node.target,
        type: { kind: "unknown" },
        source: "assignment",
        location: node.location,
        astNode: node
      });
      if (node.blocks) {
        visitBlocks(node.blocks, variables, types);
      }
      continue;
    }

    if (isBlockNode(node)) {
      if (node.blocks) visitBlocks(node.blocks, variables, types);
      if (node.then) visitBlocks(node.then, variables, types);
      if (node.else) visitBlocks(node.else, variables, types);
      if (node.whens) {
        for (const when of node.whens) {
          if (when.blocks) visitBlocks(when.blocks, variables, types);
        }
      }
    }
  }
};

export const extractBindingsFromAst = (ast: unknown): AstAnalysisResult => {
  const variables: ExtractedBinding[] = [];
  const types: ExtractedTypeDecl[] = [];

  if (Array.isArray(ast)) {
    visitBlocks(ast, variables, types);
  }

  return { variables, types };
};

export const buildTypeEnvironment = (
  ast: unknown,
  frontmatterAnalysis?: FrontmatterAnalysis | null
): TypeEnvironment => {
  const env = frontmatterAnalysis
    ? TypeEnvironment.fromFrontmatter(frontmatterAnalysis)
    : new TypeEnvironment();

  const { variables, types } = extractBindingsFromAst(ast);

  for (const typeDecl of types) {
    env.addType({
      name: typeDecl.name,
      type: typeDecl.type,
      location: typeDecl.location
    });
  }

  for (const binding of variables) {
    const existing = env.lookupVariable(binding.name);
    if (!existing || existing.source !== "input") {
      env.addVariable({
        name: binding.name,
        type: binding.type,
        source: binding.source,
        location: binding.location
      });
    }
  }

  return env;
};
