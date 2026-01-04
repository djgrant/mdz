# Contract Checking - COMPLETED (Basic)

## Goal/Problem

The vision defines tooling that validates logical coherence:
- Do call sites match declared interfaces?
- Are types consistent across skill boundaries?
- Are required parameters provided?
- Do type names match across boundaries?

Currently the compiler has no validation capabilities - it only transforms.

## Scope

- `src/compiler/compiler.ts` - add validation phase
- `tests/compiler.test.ts` - add validation tests

## Results

**COMPLETED (Basic Level)** - Core validation implemented in v0.3 compiler.

### Implemented:

1. **Symbol tables:**
   - `definedTypes: Set<string>` - tracks type definitions
   - `definedVariables: Set<string>` - tracks variable declarations  
   - `declaredDeps: Set<string>` - tracks uses:/imports: declarations

2. **Type checking (E008):**
   - When variable has type annotation, verify type is defined
   - Warns on undefined type references

3. **Reference validation:**
   - W001: Skill referenced but not declared in uses:/imports:
   - E009: Skill not found in registry (when registry provided)
   - E010: Local section reference doesn't exist

4. **Basic scope checking:**
   - Track loop variables from FOR EACH
   - Track variable declarations

5. **Cross-skill validation:**
   - Registry interface for multi-skill validation
   - Validates referenced skills exist in registry

### NOT YET Implemented (Future work):

1. **Call site / interface matching:**
   - When `[[skill]] WITH:` is used, validate parameters match skill's declared interface
   - Requires: extracting interface from referenced skill AST

2. **Cross-skill type consistency:**
   - When passing `$x: $Task` to a skill expecting `$Task`, validate the types align
   - Requires: type registry across skills

3. **Required parameter checking:**
   - Validate required parameters are provided at call sites
   - Requires: call-site parameter extraction

### Tests:
- "warns on undefined type reference" ✓
- "no warning when type is defined" ✓
- "warns on undeclared skill reference" ✓  
- "no warning when skill is declared in uses:" ✓
- "errors on undefined local section reference" ✓
- "no error when local section exists" ✓
- "validates references against registry" ✓

## Evaluation

Basic validation is working:
1. ✅ Type reference validation catches undefined types
2. ✅ Reference validation catches undeclared skills
3. ✅ Section validation catches broken local refs
4. ✅ Registry integration enables cross-skill checks

For advanced contract checking (interface matching, cross-skill types):
- Would need to parse delegation syntax more deeply
- Would need to build type registry across skills
- Recommend as separate work package if needed
