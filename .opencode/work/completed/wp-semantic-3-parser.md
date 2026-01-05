---
size: sm
category: language
parent: wp-p1-semantic-marker-syntax
status: completed
---

# Update Parser for Semantic Marker Syntax

## Goal/Problem

Update the parser to handle new semantic marker tokens and produce correct AST nodes.

## Scope

- `packages/core/src/parser/parser.ts`
- `packages/core/src/parser/ast.ts`

## Approach

### AST Changes (ast.ts)

1. Update `SemanticMarker` interface:
   ```typescript
   export interface SemanticMarker extends BaseNode {
     kind: 'SemanticMarker';
     content: string;
     variables: VariableReference[];  // embedded $vars
   }
   ```

2. Add `InferredVariable` interface:
   ```typescript
   export interface InferredVariable extends BaseNode {
     kind: 'InferredVariable';
     name: string;  // e.g., "index" from $/index/
   }
   ```

3. Update union types to include `InferredVariable`

### Parser Changes (parser.ts)

1. Update `parseSemanticMarker()`:
   - Handle `SEMANTIC_MARKER` token
   - Extract content and any embedded variables

2. Add `parseInferredVariable()`:
   - Handle `INFERRED_VAR` token
   - Extract name from `$/name/`

3. Update `parseVariableDeclaration()`:
   - Support `$var: /description/ = value` syntax
   - Semantic type annotation uses `/description/`

4. Update all places that currently call `parseSemanticMarker()`

## Hypothesis

Parser changes follow naturally from lexer changes. Main work is updating all call sites and ensuring AST types are correct.

## Results

### Completed Changes

**AST (ast.ts):**
- Added `InferredVariable` interface with `kind: 'InferredVariable'` and `name: string`
- Updated `Expression` union type to include `InferredVariable`
- Updated `InlineContent` union type to include `InferredVariable`
- Updated `VariableDeclaration.typeAnnotation` to accept `TypeReference | SemanticType | null` for semantic type annotations

**Parser (parser.ts):**
- Updated `parseSemanticMarker()` to handle both legacy `SEMANTIC_OPEN` and new `SEMANTIC_MARKER` tokens
- Added `parseInferredVariable()` method to handle `INFERRED_VAR` tokens
- Updated `parseVariableDeclaration()` to support `$var: /description/ = value` semantic type syntax
- Updated `parsePrimary()` to check for `SEMANTIC_MARKER` and `INFERRED_VAR` tokens
- Updated `parseTemplateLiteral()` to handle new tokens in template strings
- Updated `parseParagraph()` to handle new tokens in prose content
- Updated `parseInlineText()` to stop on new token types

**Compiler (compiler.ts):**
- Added `getTypeAnnotationName()` helper method to handle both `TypeReference` and `SemanticType`
- Updated `extractVariableDeclaration()` and `extractParameters()` to use the helper

**Tests:**
- Updated test files to use type narrowing for `typeAnnotation` access

### Test Results

All 169 tests pass:
- parser.test.ts: 44 passed
- compiler.test.ts: 34 passed
- integration.test.ts: 22 passed
- edge-cases.test.ts: 32 passed
- v02-features.test.ts: 31 passed
- examples.test.ts: 6 passed

## Evaluation

Parser correctly produces AST for all semantic marker patterns:
- `/content with spaces/` -> `SemanticMarker` node
- `$/name/` -> `InferredVariable` node  
- `$var: /description/ = value` -> `VariableDeclaration` with `SemanticType` annotation
- Legacy `{~~content}` syntax continues to work (backward compatible)
