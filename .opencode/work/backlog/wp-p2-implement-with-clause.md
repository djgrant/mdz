---
size: md
category: language
parent: wp-p1-language-coherence-master
status: completed
---

# Implement WITH Clause Parsing

## Goal/Problem

Implement full parser support for `WITH:` delegation syntax.

**Decision:** @djgrant chose Option B (implement fully).

## Target Syntax

```mdz
Execute [[skill-name]] WITH:
  - $param: $Type = value
  - $required: $Task
```

## Scope

- `packages/core/src/parser/lexer.ts` - WITH token already exists
- `packages/core/src/parser/parser.ts` - Add parseDelegation, parseWithClause
- `packages/core/src/parser/ast.ts` - Delegation type already exists
- `packages/core/src/compiler/compiler.ts` - Extract delegation metadata
- `spec/grammar.md` - Already documented
- `spec/language-spec.md` - Already documented

## Implementation Tasks

1. [x] Implement `parseWithClause()` in parser - logic is inline in parseDelegation()
2. [x] Implement `parseDelegation()` to recognize `verb [[ref]] WITH:` pattern
3. [x] Instantiate `Delegation` AST nodes
4. [x] Extract delegation info in compiler for dependency graph
5. [x] Add validation: referenced skill exists (via validateReferences)
6. [x] Add validation: parameters match target interface (validateContracts)
7. [x] Update examples to use WITH: syntax - skill-composer.mdz already uses it
8. [x] Add tests for delegation parsing

## Approach

1. Study existing control flow parsing patterns
2. Implement WITH clause as list of variable declarations
3. Recognize delegation verbs (Execute, Delegate, Use) followed by reference
4. Test with existing examples

## Hypothesis

Implementing WITH clause enables contract checking and better tooling support for skill composition.

## Results

**Implementation complete.** The WITH clause parsing was already largely implemented. This work package consolidated and enhanced it:

### Changes Made

1. **Parser enhancements** (`packages/core/src/parser/parser.ts`):
   - Added "delegate" and "use" as recognized delegation verbs (in addition to execute, call, run, invoke)
   - Restored imports parsing from frontmatter (parseImports method, parseYaml with imports support)

2. **AST types** (`packages/core/src/parser/ast.ts`):
   - Added `ImportDeclaration` interface
   - Added `imports` field to `Frontmatter` interface

3. **Compiler metadata** (`packages/core/src/compiler/compiler.ts`):
   - Added `ImportInfo` interface
   - Added `imports` field to `DocumentMetadata`
   - Added imports extraction in `extractMetadata()`
   - Imports are tracked as declared dependencies for validation

4. **Tests** (`tests/parser.test.ts`):
   - Added 12 new tests for WITH clause parsing:
     - Delegation without WITH clause
     - Various verbs (Call, Delegate, Use)
     - Typed required parameters
     - Default values
     - Typed default values
     - Multiple parameters
     - Section references
     - Variable reference values
     - Array literal values
     - Delegation inside FOR EACH

### Test Results

All 171 tests pass:
- Parser tests: 44 passed
- Compiler tests: 34 passed
- Integration tests: 22 passed
- Edge cases tests: 32 passed
- v0.2 features tests: 39 passed

### WITH Clause Features

- **Required parameters**: `- $param: $Type` (no default value)
- **Optional parameters**: `- $param = value`
- **Typed optional**: `- $param: $Type = value`
- **Variable references**: `- $param = $otherVar`
- **Literals**: strings, numbers, booleans, arrays

### Contract Validation

The compiler validates delegation contracts:
- Warns if skill is not declared in `uses:` or `imports:`
- Errors if required parameters are missing
- Warns if extra parameters are provided

## Evaluation

The implementation feels clean and well-integrated with the existing parser patterns. The WITH clause syntax aligns with the Input section parameter syntax, making it intuitive. Contract validation provides useful feedback during development.
