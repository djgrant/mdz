---
size: md
category: tooling
---

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
- ✅ Fixed parser to correctly handle `WITH:` parameter syntax using list markers
- ✅ Added comprehensive unit tests for contract validation scenarios
- ✅ Updated examples to demonstrate working delegation with parameters

## Evaluation

**Issues Fixed:**

1. **Parser Bug Fixed**: Updated `parseDelegation()` to parse WITH parameters as list items (using `-` markers) instead of indented blocks, matching the Input section parsing pattern.

2. **Tests Added**: Added comprehensive contract validation tests covering missing required parameters, provided parameters, and extra parameters.

3. **Examples Updated**: Modified skill-composer.mdz to demonstrate delegation with WITH parameters.

4. **Validation Logic Improved**: Modified contract validation to check for extra parameters even when no parameters are defined in the target skill.

**Verification:**

- All parser tests pass (32/32)
- All compiler tests pass (34/34)
- Contract validation correctly identifies missing required parameters, accepts valid delegations, and warns about extra parameters
- Examples compile without errors and demonstrate proper syntax

The implementation now provides reliable contract checking with good developer experience.
