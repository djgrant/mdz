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

- ✅ Produced Delegation AST nodes in parser (parseDelegation function)
- ✅ Extract parameter requirements from Input sections (extractParameters method)
- ✅ Validate call sites provide required parameters (validateContracts method)
- ✅ Emit diagnostics for mismatches (E011 for missing required params, W002 for extra params)

## Evaluation

Contract checking successfully catches parameter mismatches before runtime. The DX is good - developers get clear error messages when delegating to skills with incorrect parameters. This prevents integration bugs that would only surface during execution.
