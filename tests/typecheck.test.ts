import * as AST from '../packages/core/src/parser/ast';
import {
  buildTypeEnv,
  resolveType,
  isCompatible,
  inferType,
  makeSemanticType,
  makeTypeReference,
} from '../packages/core/src/typecheck/typecheck';

// ============================================================================
// Test Runner
// ============================================================================

interface TestContext {
  passed: number;
  failed: number;
}

const ctx: TestContext = { passed: 0, failed: 0 };

function test(name: string, fn: () => void): void {
  try {
    fn();
    ctx.passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    ctx.failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// Shared Typecheck Rules
// ============================================================================

describe('Typecheck - Shared Compatibility', () => {
  test('resolves enum subset compatibility', () => {
    const env = buildTypeEnv([
      {
        kind: 'TypeDefinition',
        name: 'Color',
        typeExpr: {
          kind: 'EnumType',
          values: ['red', 'green', 'blue'],
          span: AST.createSpan(0, 0, 0, 0, 0, 0),
        },
        span: AST.createSpan(0, 0, 0, 0, 0, 0),
      },
    ]);

    const candidate: AST.TypeExpr = {
      kind: 'EnumType',
      values: ['red', 'blue'],
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };

    const expected = makeTypeReference('Color');
    const result = isCompatible(candidate, expected, env);
    assertEqual(result.compatible, true, 'Enum subset should be compatible');
  });

  test('resolves alias chains with depth guard', () => {
    const aliasSpan = AST.createSpan(0, 0, 0, 0, 0, 0);
    const env = buildTypeEnv([
      {
        kind: 'TypeDefinition',
        name: 'Alpha',
        typeExpr: makeTypeReference('Beta'),
        span: aliasSpan,
      },
      {
        kind: 'TypeDefinition',
        name: 'Beta',
        typeExpr: makeTypeReference('Alpha'),
        span: aliasSpan,
      },
    ]);

    const resolved = resolveType(makeTypeReference('Alpha'), env, { maxDepth: 2 });
    assertEqual(resolved.kind, 'TypeReference');
    assertEqual((resolved as AST.TypeReference).name, 'Alpha');
  });

  test('requires exact function parameter match', () => {
    const env = new Map<string, AST.TypeExpr>();
    const candidate: AST.TypeExpr = {
      kind: 'FunctionType',
      params: ['a', 'b'],
      returnType: makeTypeReference('String'),
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };
    const expected: AST.TypeExpr = {
      kind: 'FunctionType',
      params: ['a'],
      returnType: makeTypeReference('String'),
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };

    const result = isCompatible(candidate, expected, env);
    assertEqual(result.compatible, false, 'Function arity mismatch should fail');
  });

  test('semantic types are compatible with any', () => {
    const env = new Map<string, AST.TypeExpr>();
    const candidate = makeSemanticType('any task');
    const expected = makeTypeReference('Any');
    const result = isCompatible(candidate, expected, env);
    assertEqual(result.compatible, true, 'Semantic types should be Any compatible');
  });

  test('array element type must be compatible', () => {
    const env = new Map<string, AST.TypeExpr>();
    const candidate: AST.TypeExpr = {
      kind: 'ArrayType',
      elementType: makeTypeReference('Number'),
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };
    const expected: AST.TypeExpr = {
      kind: 'ArrayType',
      elementType: makeTypeReference('String'),
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };
    const result = isCompatible(candidate, expected, env);
    assertEqual(result.compatible, false, 'Array element mismatch should fail');
  });
});

describe('Typecheck - Shallow Inference', () => {
  test('infers lambda return from literals', () => {
    const env = new Map<string, AST.TypeExpr>();
    const lambda: AST.LambdaExpression = {
      kind: 'LambdaExpression',
      params: ['name'],
      body: {
        kind: 'StringLiteral',
        value: 'hello',
        span: AST.createSpan(0, 0, 0, 0, 0, 0),
      },
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };

    const inferred = inferType(lambda, env);
    assertEqual(inferred.kind, 'FunctionType');
    const fn = inferred as AST.FunctionType;
    assertEqual(fn.returnType.kind, 'TypeReference');
    assertEqual((fn.returnType as AST.TypeReference).name, 'String');
  });

  test('infers array literal element type', () => {
    const env = new Map<string, AST.TypeExpr>();
    const arrayLiteral: AST.ArrayLiteral = {
      kind: 'ArrayLiteral',
      elements: [
        {
          kind: 'NumberLiteral',
          value: 1,
          span: AST.createSpan(0, 0, 0, 0, 0, 0),
        },
        {
          kind: 'NumberLiteral',
          value: 2,
          span: AST.createSpan(0, 0, 0, 0, 0, 0),
        },
      ],
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };

    const inferred = inferType(arrayLiteral, env);
    assertEqual(inferred.kind, 'ArrayType');
    const arrayType = inferred as AST.ArrayType;
    assertEqual(arrayType.elementType.kind, 'TypeReference');
    assertEqual((arrayType.elementType as AST.TypeReference).name, 'Number');
  });

  test('infers mixed array as Any element', () => {
    const env = new Map<string, AST.TypeExpr>();
    const arrayLiteral: AST.ArrayLiteral = {
      kind: 'ArrayLiteral',
      elements: [
        {
          kind: 'NumberLiteral',
          value: 1,
          span: AST.createSpan(0, 0, 0, 0, 0, 0),
        },
        {
          kind: 'StringLiteral',
          value: 'two',
          span: AST.createSpan(0, 0, 0, 0, 0, 0),
        },
      ],
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };

    const inferred = inferType(arrayLiteral, env);
    assertEqual(inferred.kind, 'ArrayType');
    const arrayType = inferred as AST.ArrayType;
    assertEqual(arrayType.elementType.kind, 'SemanticType');
  });

  test('infers variable type from environment', () => {
    const env = new Map<string, AST.TypeExpr>();
    env.set('count', makeTypeReference('Number'));
    const reference: AST.VariableReference = {
      kind: 'VariableReference',
      name: 'count',
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };
    const inferred = inferType(reference, env);
    assertEqual(inferred.kind, 'TypeReference');
    assertEqual((inferred as AST.TypeReference).name, 'Number');
  });

  test('infers template literals as String', () => {
    const env = new Map<string, AST.TypeExpr>();
    const template: AST.TemplateLiteral = {
      kind: 'TemplateLiteral',
      parts: ['value-', {
        kind: 'VariableReference',
        name: 'name',
        span: AST.createSpan(0, 0, 0, 0, 0, 0),
      }],
      span: AST.createSpan(0, 0, 0, 0, 0, 0),
    };
    const inferred = inferType(template, env);
    assertEqual(inferred.kind, 'TypeReference');
    assertEqual((inferred as AST.TypeReference).name, 'String');
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ Typecheck Tests ===\n');
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}
