---
size: sm
category: tooling
---

# Unit Testing Framework - Scoping

## Goal/Problem

How do developers test their MDZ skills? We need to understand the requirements before building.

**This is a SCOPING exercise, not implementation.**

## Scope

- Research only
- Output: Requirements doc and recommended approach

## Approach

1. What would a test look like for an MDZ skill?
   - Mock LLM responses?
   - Test control flow paths?
   - Validate outputs against expected schemas?

2. What existing tools could we build on?
   - vitest - JS testing framework
   - evalite - LLM evaluation framework
   - Custom runner?

3. What's the minimal viable testing story?

4. How do we handle non-determinism (LLM outputs vary)?

## Hypothesis

Understanding the problem space will reveal whether this is a small wrapper or a significant undertaking.

## Results

### 1. Testing Dimensions for MDZ Skills

MDZ skills have three distinct testable layers:

**a) Structural Validation (Static)**
- Does the skill parse correctly?
- Are all referenced skills/sections valid?
- Are types defined and used consistently?
- *Already exists: `compile()` with diagnostics*

**b) Control Flow Logic (Deterministic)**
- Does the control flow structure make sense?
- Are loops terminating?
- Are branches reachable?
- *Could be tested with mock data*

**c) LLM Behavior (Non-deterministic)**
- Does the skill produce useful outputs?
- Are semantic markers interpreted correctly?
- Does it handle edge cases gracefully?
- *Requires LLM evaluation approach*

### 2. Existing Tools Analysis

**vitest/jest**
- ✅ Familiar API, fast, TypeScript native
- ✅ Already used for compiler tests
- ❌ No built-in LLM evaluation primitives

**evalite**
- ✅ Purpose-built for LLM testing
- ✅ Built on vitest, familiar patterns
- ✅ Scorers (Levenshtein, LLM-as-judge, custom)
- ✅ Traces for debugging
- ✅ UI for exploring results
- ✅ SQLite persistence for comparison over time
- ❌ Requires running actual LLM calls (cost)

**autoevals (braintrust)**
- ✅ Pre-built scorers (Factuality, Relevance, etc.)
- ✅ Works with evalite
- ❌ Some scorers require OpenAI

### 3. Test Types and Approaches

**Type A: Syntax/Structure Tests**
```typescript
// Already working - extend this pattern
test('skill parses without errors', () => {
  const result = compile(mySkill);
  expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
});
```

**Type B: Mock-Based Unit Tests**
```typescript
// Test control flow with mocked LLM
test('processes each item in collection', () => {
  const mockLLM = createMockLLM({
    'process item': (item) => `processed: ${item}`
  });
  const result = await run(skill, { items: ['a', 'b'] }, { llm: mockLLM });
  expect(result.trace).toContain('processed: a');
  expect(result.trace).toContain('processed: b');
});
```

**Type C: Evaluation Tests (evalite)**
```typescript
// Test with real LLM, score outputs
evalite("PR Review Quality", {
  data: [{ input: prDiff, expected: "constructive feedback" }],
  task: async (input) => runSkill('pr-reviewer', { diff: input }),
  scorers: [
    { name: 'HasActionItems', scorer: ({ output }) => output.includes('TODO') ? 1 : 0 },
    Factuality,  // LLM-as-judge scorer
  ],
});
```

### 4. Recommended Approach

**Phase 1: Extend Existing Tests (Low effort)**
- Continue using vitest for structural tests
- Add test utilities: `expectNoErrors(skill)`, `expectType(skill, 'TaskName')`
- Test against example skills in `/examples/`

**Phase 2: Add Mock Runtime (Medium effort)**
- Create mock LLM interface for deterministic testing
- Enable testing control flow without LLM costs
- Record/replay capabilities for debugging

**Phase 3: evalite Integration (Higher effort)**
- Integrate evalite for quality evals
- Define domain-specific scorers
- Build golden test sets
- CI integration with score thresholds

### 5. Handling Non-Determinism

**Strategies:**
- **Mock responses**: Replace LLM with deterministic mock for unit tests
- **Semantic scoring**: Use fuzzy matchers (Levenshtein, embedding similarity)
- **LLM-as-judge**: Let an LLM evaluate if output meets criteria
- **Property testing**: Check structural properties (length, format, contains)
- **Golden snapshots**: Compare against approved outputs, allow variance

**Recommended pattern:**
- Use mocks for fast, deterministic unit tests (CI)
- Use evalite with real LLM for quality evals (nightly/release)

### 6. Minimal Viable Testing Story

```typescript
// tests/skills/pr-reviewer.test.ts
import { validateSkill, mockRun } from '@mdz/testing';
import prReviewer from '../examples/pr-reviewer.mdz';

describe('pr-reviewer skill', () => {
  it('parses without errors', () => {
    const result = validateSkill(prReviewer);
    expect(result.errors).toHaveLength(0);
  });

  it('reviews each file in the PR', async () => {
    const result = await mockRun(prReviewer, {
      input: { files: ['a.ts', 'b.ts'] },
      mocks: { 'analyze file': file => `reviewed: ${file}` }
    });
    expect(result.outputs).toContain('reviewed: a.ts');
  });
});
```

### 7. Effort Estimates

- **Phase 1 (vitest utilities)**: 1-2 days
- **Phase 2 (mock runtime)**: 3-5 days
- **Phase 3 (evalite integration)**: 3-5 days
- **Total for full testing story**: ~2 weeks

## Evaluation

**Key Insights:**
1. Testing MDZ has three layers - structural (easy), control flow (medium), LLM behavior (hard)
2. Evalite is the right tool for LLM evaluation - built on vitest, great UX
3. Mock-based testing should be the primary approach for fast CI
4. Non-determinism is manageable with the right patterns

**Recommendation:**
Start with Phase 1 (vitest utilities) immediately. It's low effort and high value. Phase 2 (mock runtime) should be implemented when we have users who need deterministic testing. Phase 3 (evalite) is for when we need quality evaluation.

**Not a small wrapper** - but not massive either. ~2 weeks for full story, but incremental value at each phase.
