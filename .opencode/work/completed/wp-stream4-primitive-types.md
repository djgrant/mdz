# Stream 4: Language Primitive Types

## Goal/Problem
Add built-in primitive types that don't trigger validation warnings, and add a warning for non-primitive types like $FilePath.

## Scope
- `src/compiler/compiler.ts` - Add primitive type recognition
- `tests/compiler.test.ts` - Add tests for primitive types

## Approach
1. Define built-in primitives: $String, $Number, $Boolean
2. In validateTypes(), skip warnings for these built-in types
3. Non-primitives like $FilePath still trigger warning
4. Add tests to verify behavior

## Hypothesis
Adding a set of recognized primitive types to the compiler will allow common type annotations without triggering "type not defined" warnings, while still warning about domain-specific types that should be defined.

## Results

### Changes Made

1. **Added BUILTIN_PRIMITIVES constant** in `src/compiler/compiler.ts`:
```typescript
const BUILTIN_PRIMITIVES = new Set(['String', 'Number', 'Boolean']);
```

2. **Updated validateTypes()** to check for built-in primitives:
```typescript
if (varInfo.type && !this.definedTypes.has(varInfo.type)) {
  if (BUILTIN_PRIMITIVES.has(varInfo.type)) {
    continue;  // Skip warning for built-in primitives
  }
  // Generate warning for undefined types...
}
```

3. **Added 5 tests** in `tests/compiler.test.ts`:
   - $String does not trigger warning
   - $Number does not trigger warning  
   - $Boolean does not trigger warning
   - $FilePath triggers warning (not a primitive)
   - Multiple primitives in same document

4. **Also updated**: Comments in compiler to say "MDZ" instead of "Zen"

### Test Results
All 39 tests pass including the new primitive type tests.

## Evaluation
✅ Hypothesis confirmed. Built-in primitive types work as expected:
- $String, $Number, $Boolean are recognized without needing explicit definition
- Other types like $FilePath still require explicit definition or trigger warnings
- This provides a better developer experience for common types
