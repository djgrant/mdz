# Advanced Contract Checking

## Goal/Problem

Implement call site interface matching - verify parameters passed match what target skill expects.

**Reference:** ROADMAP.md Section 1 - Tooling Refactor remaining opportunities

## Scope

- `src/compiler/compiler.ts`
- `src/parser/parser.ts`

## Approach

1. Produce Delegation AST nodes from parser (currently defined but not produced)
2. Extract parameter requirements from target skills
3. Validate call sites provide required parameters
4. Emit diagnostics for mismatches

## Hypothesis

Contract checking catches integration errors before runtime.

## Results

{To be filled out upon completion}

## Evaluation

{Does this catch real bugs? Is the DX good?}
