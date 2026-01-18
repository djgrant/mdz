import * as AST from '../parser/ast';

export type TypeEnv = Map<string, AST.TypeExpr>;

export interface ResolveOptions {
  maxDepth?: number;
}

export interface InferOptions {
  maxDepth?: number;
}

export type CompatibilityResult = {
  compatible: boolean;
  reason?: string;
};

const DEFAULT_MAX_DEPTH = 12;

const BUILTIN_TYPES = new Set(['String', 'Number', 'Boolean', 'FilePath', 'Any']);

const ANY_TYPE: AST.SemanticType = {
  kind: 'SemanticType',
  description: 'any',
  span: AST.createSpan(0, 0, 0, 0, 0, 0),
};

function normalizeEnumValues(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isAnyType(expr: AST.TypeExpr): boolean {
  if (expr.kind === 'SemanticType') {
    return true;
  }
  if (expr.kind === 'TypeReference') {
    return expr.name === 'Any';
  }
  return false;
}

export function buildTypeEnv(types: AST.TypeDefinition[], extra: TypeEnv = new Map()): TypeEnv {
  const env = new Map(extra);
  for (const typeDef of types) {
    env.set(typeDef.name, typeDef.typeExpr);
  }
  return env;
}

export function resolveType(expr: AST.TypeExpr, env: TypeEnv, options: ResolveOptions = {}): AST.TypeExpr {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const visited = new Set<string>();

  const resolve = (current: AST.TypeExpr, depth: number): AST.TypeExpr => {
    if (depth > maxDepth) {
      return current;
    }

    if (current.kind === 'TypeReference') {
      if (BUILTIN_TYPES.has(current.name)) {
        return current;
      }

      const next = env.get(current.name);
      if (!next) {
        return current;
      }

      if (visited.has(current.name)) {
        return current;
      }

      visited.add(current.name);
      return resolve(next, depth + 1);
    }

    if (current.kind === 'ArrayType') {
      return {
        ...current,
        elementType: resolve(current.elementType, depth + 1),
      };
    }

    if (current.kind === 'CompoundType') {
      return {
        ...current,
        elements: current.elements.map(element => resolve(element, depth + 1)),
      };
    }

    if (current.kind === 'FunctionType') {
      return {
        ...current,
        returnType: resolve(current.returnType, depth + 1),
      };
    }

    return current;
  };

  return resolve(expr, 0);
}

export function normalizeType(expr: AST.TypeExpr): AST.TypeExpr {
  if (expr.kind === 'EnumType') {
    return {
      ...expr,
      values: normalizeEnumValues(expr.values),
    };
  }

  if (expr.kind === 'ArrayType') {
    return {
      ...expr,
      elementType: normalizeType(expr.elementType),
    };
  }

  if (expr.kind === 'CompoundType') {
    return {
      ...expr,
      elements: expr.elements.map(element => normalizeType(element)),
    };
  }

  if (expr.kind === 'FunctionType') {
    return {
      ...expr,
      returnType: normalizeType(expr.returnType),
    };
  }

  return expr;
}

export function isCompatible(
  candidate: AST.TypeExpr,
  expected: AST.TypeExpr,
  env: TypeEnv,
  options: ResolveOptions = {}
): CompatibilityResult {
  const resolvedCandidate = normalizeType(resolveType(candidate, env, options));
  const resolvedExpected = normalizeType(resolveType(expected, env, options));

  if (isAnyType(resolvedExpected) || isAnyType(resolvedCandidate)) {
    return { compatible: true };
  }

  if (resolvedExpected.kind === 'TypeReference' && resolvedCandidate.kind === 'TypeReference') {
    if (resolvedExpected.name === resolvedCandidate.name) {
      return { compatible: true };
    }
  }

  if (resolvedExpected.kind !== resolvedCandidate.kind) {
    return { compatible: false, reason: 'kind-mismatch' };
  }

  switch (resolvedExpected.kind) {
    case 'SemanticType':
      return {
        compatible: resolvedExpected.description === (resolvedCandidate as AST.SemanticType).description,
        reason: 'semantic-mismatch',
      };
    case 'EnumType': {
      const expectedValues = new Set(resolvedExpected.values);
      const candidateValues = (resolvedCandidate as AST.EnumType).values;
      const missing = candidateValues.filter(value => !expectedValues.has(value));
      if (missing.length > 0) {
        return { compatible: false, reason: 'enum-subset' };
      }
      return { compatible: true };
    }
    case 'ArrayType':
      return isCompatible(
        (resolvedCandidate as AST.ArrayType).elementType,
        resolvedExpected.elementType,
        env,
        options
      );
    case 'CompoundType': {
      const expectedElements = resolvedExpected.elements;
      const candidateElements = (resolvedCandidate as AST.CompoundType).elements;
      if (expectedElements.length !== candidateElements.length) {
        return { compatible: false, reason: 'tuple-length' };
      }
      for (let i = 0; i < expectedElements.length; i += 1) {
        const result = isCompatible(candidateElements[i], expectedElements[i], env, options);
        if (!result.compatible) {
          return result;
        }
      }
      return { compatible: true };
    }
    case 'FunctionType': {
      const expectedFn = resolvedExpected as AST.FunctionType;
      const candidateFn = resolvedCandidate as AST.FunctionType;
      if (expectedFn.params.length !== candidateFn.params.length) {
        return { compatible: false, reason: 'function-arity' };
      }
      for (let i = 0; i < expectedFn.params.length; i += 1) {
        if (expectedFn.params[i] !== candidateFn.params[i]) {
          return { compatible: false, reason: 'function-params' };
        }
      }
      const returnCompat = isCompatible(candidateFn.returnType, expectedFn.returnType, env, options);
      if (!returnCompat.compatible) {
        return { compatible: false, reason: 'function-return' };
      }
      return { compatible: true };
    }
    case 'TypeReference':
      return {
        compatible: resolvedExpected.name === (resolvedCandidate as AST.TypeReference).name,
        reason: 'reference-mismatch',
      };
    default:
      return { compatible: false, reason: 'unknown' };
  }
}

export function inferType(
  expr: AST.Expression,
  env: TypeEnv,
  options: InferOptions = {}
): AST.TypeExpr {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const resolveOptions: ResolveOptions = { maxDepth };

  const infer = (node: AST.Expression, depth: number): AST.TypeExpr => {
    if (depth > maxDepth) {
      return ANY_TYPE;
    }

    switch (node.kind) {
      case 'StringLiteral':
        return { kind: 'TypeReference', name: 'String', span: node.span };
      case 'NumberLiteral':
        return { kind: 'TypeReference', name: 'Number', span: node.span };
      case 'BooleanLiteral':
        return { kind: 'TypeReference', name: 'Boolean', span: node.span };
      case 'ArrayLiteral': {
        if (node.elements.length === 0) {
          return { kind: 'ArrayType', elementType: ANY_TYPE, span: node.span };
        }
        const elementTypes = node.elements.map(element => infer(element, depth + 1));
        let current = elementTypes[0];
        for (let i = 1; i < elementTypes.length; i += 1) {
          if (!isCompatible(elementTypes[i], current, env, resolveOptions).compatible) {
            current = ANY_TYPE;
            break;
          }
        }
        return { kind: 'ArrayType', elementType: current, span: node.span };
      }
      case 'LambdaExpression': {
        const returnType = infer(node.body, depth + 1);
        return {
          kind: 'FunctionType',
          params: node.params,
          returnType,
          span: node.span,
        };
      }
      case 'VariableReference': {
        const type = env.get(node.name);
        if (type) {
          return resolveType(type, env, resolveOptions);
        }
        return ANY_TYPE;
      }
      case 'MemberAccess':
        return ANY_TYPE;
      case 'FunctionCall':
        return ANY_TYPE;
      case 'TemplateLiteral':
        return { kind: 'TypeReference', name: 'String', span: node.span };
      case 'InlineText':
        return ANY_TYPE;
      case 'Link':
      case 'Anchor':
      case 'InferredVariable':
      case 'BinaryExpression':
      case 'UnaryExpression':
        return ANY_TYPE;
      default:
        return ANY_TYPE;
    }
  };

  return normalizeType(resolveType(infer(expr, 0), env, resolveOptions));
}

export function makeSemanticType(description: string): AST.SemanticType {
  return {
    kind: 'SemanticType',
    description,
    span: AST.createSpan(0, 0, 0, 0, 0, 0),
  };
}

export function makeTypeReference(name: string): AST.TypeReference {
  return {
    kind: 'TypeReference',
    name,
    span: AST.createSpan(0, 0, 0, 0, 0, 0),
  };
}
