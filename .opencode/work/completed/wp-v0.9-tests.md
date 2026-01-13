# v0.9 Test Updates

## Goal

Update test suite for v0.9 language changes.

## Scope

- `tests/parser.test.ts`
- `tests/compiler.test.ts`
- `tests/delegate.test.ts`
- `tests/v02-features.test.ts`
- `tests/examples.test.ts`
- `tests/integration.test.ts`
- NEW: `tests/v09-features.test.ts`

## Approach

### Tests to Remove (PARALLEL FOR EACH)

**v02-features.test.ts (14 tests):**
- `parses basic PARALLEL FOR EACH`
- `parses PARALLEL FOR EACH with destructuring`
- `parses PARALLEL FOR EACH with complex collection`
- `parses nested control flow inside PARALLEL FOR EACH`
- `parses multiple PARALLEL FOR EACH`
- `preserves PARALLEL FOR EACH in output`
- `tracks PARALLEL FOR EACH in source map`
- `parses BREAK inside PARALLEL FOR EACH`
- `parses CONTINUE inside PARALLEL FOR EACH`
- `nested PARALLEL FOR EACH inside regular FOR EACH`
- `empty PARALLEL FOR EACH body`
- (+ modify `complex skill with all v0.2 features`)

**delegate.test.ts (1 test):**
- `parses DELEGATE inside PARALLEL FOR EACH`

### Tests to Modify (WITH Syntax)

**parser.test.ts (~9 tests):**
- `parses delegation with WITH parameters`
- `parses WITH clause with typed required parameter`
- `parses WITH clause with default value`
- `parses WITH clause with typed default value`
- `parses WITH clause with multiple parameters`
- `parses delegation to section reference`
- `parses WITH clause with variable reference value`
- `parses WITH clause with array literal value`
- `delegation inside FOR EACH`

**compiler.test.ts (~3 tests):**
- `errors on missing required parameter`
- `no error when required parameter is provided`
- `warns on extra parameter`

**delegate.test.ts (~5 tests):**
- Various DELEGATE WITH clause tests

### New Test File: tests/v09-features.test.ts

```typescript
describe('v0.9 Features', () => {
  
  describe('RETURN Statement', () => {
    test('parses basic RETURN');
    test('parses RETURN with variable');
    test('parses RETURN with semantic marker');
    test('parses RETURN with literal');
    test('RETURN at end of section is valid');
    test('RETURN at end of loop is valid');
    test('errors on RETURN mid-section');
  });
  
  describe('ASYNC/AWAIT DELEGATE', () => {
    test('parses ASYNC DELEGATE');
    test('parses ASYNC DELEGATE with task');
    test('parses ASYNC DELEGATE with TO target');
    test('parses ASYNC DELEGATE without TO');
    test('parses AWAIT DELEGATE');
    test('parses result collection with <<');
  });
  
  describe('Push Operator <<', () => {
    test('parses $array << value');
    test('parses $array << ASYNC DELEGATE');
    test('parses $array << expression');
    test('validates target is defined');
  });
  
  describe('DO Instruction', () => {
    test('parses DO /instruction/');
    test('parses DO in workflow');
    test('DO distinct from WHILE...DO');
  });
  
  describe('Frontmatter Declarations', () => {
    test('parses types: block');
    test('parses input: block');
    test('parses context: block');
    test('frontmatter types available in body');
    test('frontmatter input creates required params');
    test('frontmatter context creates contextual vars');
  });
  
  describe('WITH Syntax Change', () => {
    test('parses WITH: param: value');
    test('parses WITH: block with indented params');
  });
  
});
```

### Test Counts

| Category | Remove | Modify | Add |
|----------|--------|--------|-----|
| PARALLEL FOR EACH | 14 | 1 | 0 |
| WITH Syntax | 0 | ~17 | 2 |
| RETURN | 0 | 0 | 7 |
| ASYNC/AWAIT | 0 | 0 | 6 |
| Push `<<` | 0 | 0 | 4 |
| DO Instruction | 0 | 0 | 3 |
| Frontmatter | 0 | 0 | 6 |
| **Total** | **14** | **~18** | **~28** |

## Measures of Success

- [ ] All PARALLEL FOR EACH tests removed
- [ ] All WITH syntax tests updated
- [ ] v09-features.test.ts created with ~28 tests
- [ ] All tests pass
- [ ] Coverage maintained

## Estimated Effort

19-24 hours
