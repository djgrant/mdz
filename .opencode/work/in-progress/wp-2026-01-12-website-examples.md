# Website Examples Project

## Goal/Problem

Create ~12 concrete MDZ examples for the website that demonstrate where and how MDZ adds value. The examples must avoid the trap of using MDZ for tasks where plain English would suffice.

## Scope

- `examples/` directory - new example .mdz files
- `website/src/pages/examples/` - integration with website
- `website/src/pages/playground.astro` - add examples to playground projects

## Approach

Multi-stage orchestration:

1. **Divergent Thinking Stage**
   - Generate diverse use case ideas across different domains
   - Focus on scenarios where MDZ's features provide genuine value:
     - Type definitions and validation
     - Skill composition and references
     - Control flow constructs (FOR EACH, PARALLEL, WHILE, IF)
     - Semantic markers for LLM interpretation
     - Multi-agent orchestration
   - Aim for unconventional and edge-case ideas, not just obvious ones

2. **Simplify Stage**  
   - Apply the Caveman Test: if it can't be explained why MDZ helps, eliminate it
   - Apply Kill Your Darlings: remove examples that are "clever but not useful"
   - Filter to examples where MDZ genuinely outperforms plain English
   - Reduce to ~12 high-quality examples

3. **Implementation Stage**
   - Create .mdz files in examples directory
   - Organize into sensible categories
   - Ensure examples compile without errors

4. **Integration Stage**
   - Add examples to website playground
   - Update examples page with new entries

## Hypothesis

By using divergent thinking followed by aggressive simplification, we will produce examples that:
- Showcase genuine MDZ value propositions
- Avoid the "solution looking for a problem" trap
- Provide learning value for new users
- Cover different complexity levels (beginner to advanced)

## Current Examples Assessment

The existing examples (PR Reviewer, The Scientist) are complex orchestration-focused. They demonstrate:
- Multi-file skill composition
- Work package patterns
- Parallel execution
- Type definitions

What might be missing:
- Simpler, standalone examples for beginners
- Domain-specific examples beyond code review
- Examples showing specific language features in isolation

## Results

*To be filled during execution*

## Evaluation

*To be filled upon completion*

## Divergent Thinking Results

### Domain: Software Development Workflows
1. dependency-drift-healer (15) - Detects semantic version drift
2. dead-code-archaeologist (22) - Traces unexecuted code paths
3. flaky-test-profiler (28) - Probabilistic flakiness model
4. migration-dry-runner (25) - Simulates database migrations
5. blame-chain-reconstructor (12) - Traces bug origins through history
6. env-var-contract-enforcer (30) - Validates env vars across environments
7. api-tombstone-manager (18) - Manages deprecated API lifecycle
8. secret-rotation-choreographer (20) - Zero-downtime secret rotation
9. monorepo-impact-radiator (35) - Calculates change blast radius
10. feature-flag-graveyard-keeper (32) - Cleans up stale feature flags

### Domain: Content & Documentation
1. changelog-archaeology (15) - Reconstruct missing changelogs
2. glossary-divergence-detector (20) - Find inconsistent term usage
3. doc-rot-triage (25) - Prioritize doc updates by signals
4. citation-graph-healer (30) - Fix broken + suggest missing links
5. persona-lens-generator (35) - Audience-specific doc views
6. style-guide-enforcer-with-exceptions (40) - Linting with exception tracking
7. knowledge-base-merge-resolver (12) - Merge overlapping KBs
8. api-changelog-to-migration-guide (45) - Transform changelogs to guides
9. meeting-notes-to-action-graph (50) - Extract action items with deps
10. doc-coverage-by-user-journey (18) - Map docs to user journeys

### Domain: Research & Analysis
1. adversarial-review (25) - Red team attack-defend cycles
2. citation-triangulation (35) - Verify claims via independent sources
3. steelmanning-cascade (20) - Pass steelman gate before critiquing
4. assumption-archaeology (15) - Excavate hidden assumptions
5. confidence-calibration-loop (30) - Iterative probability estimation
6. pre-mortem-branching (35) - Parallel failure mode simulation
7. crux-hunting (20) - Find the key empirical disagreement
8. fermi-decomposition-tree (40) - Multi-agent estimation with uncertainty
9. counterfactual-trace (25) - Build causal dependency maps
10. dissolving-questions (10) - Filter confused questions

### Domain: Automation & Orchestration
1. circuit-breaker-cascade (15) - Failure isolation state machine
2. git-archaeology-bisect (22) - LLM-driven semantic git bisect
3. quota-aware-batch-scheduler (18) - Rate-limited API scheduling
4. dns-propagation-waiter (25) - Monitor DNS propagation
5. canary-traffic-shepherd (20) - Gradual traffic shifting
6. secret-rotation-choreographer (12) - Zero-downtime secret rotation
7. webhook-replay-tribunal (28) - Replay failed webhooks with backoff
8. terraform-drift-reconciler (30) - Detect and remediate IaC drift
9. database-migration-conductor (18) - Blue-green DB migrations
10. llm-cascade-router (35) - Fallback LLM routing with budgets

### Domain: Pedagogical Examples
1. hello-skill (95) - Simplest possible skill
2. greeter-with-types (88) - Variables and types
3. todo-status (82) - Enum types
4. daily-checklist (75) - FOR EACH loops
5. weather-advice (70) - IF THEN ELSE conditionals
6. magic-eight-ball (45) - WHILE loops with semantic conditions
7. recipe-delegator (65) - Skill composition
8. brainstorm-parallel (55) - PARALLEL FOR EACH
9. countdown-timer (60) - WHILE + BREAK
10. pair-matcher (40) - Tuple destructuring

**Total: 48 ideas generated across 5 domains**

## Simplification Stage Results

### Caveman Test Analysis (21 survivors)
Key filter: "If plain English works just as well, MDZ adds no value."

**Patterns in survivors:**
- State machines where phase/type determines behavior
- Convergence loops with semantic (not numeric) conditions  
- Typed classification that drives branching
- Parallel operations requiring reconciliation
- Role alternation (attack/defend, thesis/antithesis)

**Patterns in rejects:**
- Deterministic operations pretending to need LLM judgment
- Single-pass analysis dressed up as iteration
- Output typing confused with control flow typing
- Hand-wavy parallelism without clear fan-out/reconcile

### Kill Your Darlings Analysis
Key filter: "Remove metaphorical/cute names. Say what it does."

**Darlings identified:**
- "archaeology" (3 instances) - just "analyzer/finder"
- "healer" (2 instances) - just "fixer/updater"
- "choreographer" (2 instances) - just "rotator/runner"  
- "graveyard keeper", "tribunal", "shepherd", "radiator"
- Domain-specific jargon: tombstone, fermi decomposition, steelmanning cascade

**Principle:** If you can't explain what it does in 3 words, the example is too complex.

### Coverage Analysis
Key filter: "Complete feature coverage, balanced complexity, progressive learning."

**Feature coverage needed:**
- Frontmatter, types (semantic, enum, tuple, array)
- Control flow (FOR EACH, PARALLEL, WHILE, IF, BREAK, CONTINUE)
- Composition ([[skill]], [[#section]], WITH:)
- Semantic markers, lambdas

**Complexity distribution:**
- Beginner (20-50 lines): 4 examples
- Intermediate (50-100 lines): 5 examples  
- Advanced (100+ lines): 3 examples

## Final Selection Synthesis

Cross-referencing the three analyses, here are the recommended ~12 examples:

### Beginner (4)
1. **todo-list** - FOR EACH, enum types, IF THEN (replaces todo-status)
2. **weather-advisor** - IF THEN ELSE with semantic conditions (simplified weather-advice)
3. **batch-greeter** - Variables, types, simple FOR EACH
4. **random-picker** - Enum types, semantic markers (simplified magic-eight-ball)

### Intermediate (5)
5. **brainstorm-parallel** - PARALLEL FOR EACH, section refs
6. **retry-until-success** - WHILE with semantic condition, BREAK
7. **multi-file-analyzer** - Skill composition, WITH parameter passing
8. **doc-freshness-checker** - Enum types, typed prioritization
9. **steelmanning** - Role types, gated progression (simplified steelmanning-cascade)

### Advanced (3)
10. **adversarial-review** - Full feature showcase, attack-defend pattern
11. **pre-mortem** - PARALLEL failure modes, typed causes
12. **secret-rotation** - State machine, phase types, verification gates

**Domain mix:** 
- General/pedagogical: 4
- Content/docs: 2
- Research/analysis: 3
- Automation/ops: 2
- Development: 1

## Stage 3: Implementation Results

### Files Created

**Beginner (4 files, 175 lines total):**
- `examples/website/beginner/todo-list.mdz` (47 lines) - FOR EACH, enum types, IF THEN ELSE
- `examples/website/beginner/weather-advisor.mdz` (41 lines) - Semantic conditions, nested IF
- `examples/website/beginner/batch-greeter.mdz` (39 lines) - Variables, types, FOR EACH
- `examples/website/beginner/random-picker.mdz` (48 lines) - Enum types, semantic markers

**Intermediate (5 files, 409 lines total):**
- `examples/website/intermediate/brainstorm-parallel.mdz` (74 lines) - PARALLEL FOR EACH, section refs
- `examples/website/intermediate/retry-until-success.mdz` (82 lines) - WHILE DO, BREAK
- `examples/website/intermediate/multi-file-analyzer.mdz` (84 lines) - Skill composition, WITH params
- `examples/website/intermediate/doc-freshness-checker.mdz` (81 lines) - Typed prioritization
- `examples/website/intermediate/steelmanning.mdz` (88 lines) - Role types, gated progression

**Advanced (3 files, 692 lines total):**
- `examples/website/advanced/adversarial-review.mdz` (203 lines) - Full feature showcase
- `examples/website/advanced/pre-mortem.mdz` (229 lines) - PARALLEL failure modes
- `examples/website/advanced/secret-rotation.mdz` (260 lines) - State machine pattern

**Total: 12 files, 1,276 lines of MDZ**

### Validation

All files pass `mdz check` with no errors.

### Next Steps

Stage 4 (pending): Integrate into website
- Add examples to playground projects
- Update examples page with new entries

## Refactoring: Applying MDZ Philosophy

### Problem Identified
Initial examples "thought in Python" - micromanaging the LLM with explicit branching logic that the runtime already knows. Examples like `IF $temperature < 10 THEN wear_coat` miss the point: the LLM *knows* what to wear.

### MDZ Philosophy Applied
1. **Types define contracts** - What the output should be, not how to compute it
2. **Semantic markers delegate judgment** - Let the LLM use its knowledge
3. **Control flow orchestrates** - Coordinates work, doesn't compute
4. **State lives in artifacts** - Files/work packages, not context variables
5. **Skills encapsulate capabilities** - Componentized intelligence

### Results

| Tier | Before | After | Reduction |
|------|--------|-------|-----------|
| Beginner (4) | 175 | 87 | 50% |
| Intermediate (5) | 409 | 313 | 23% |
| Advanced (3) | 695 | 456 | 34% |
| **Total** | **1,279** | **856** | **33%** |

### Key Transformations

**Beginner:**
- Removed algorithmic branching (temperature thresholds, status checks)
- Defined semantic types that delegate judgment
- Brevity as feature: 20-25 lines each

**Intermediate:**
- Inline instructions → Skill references
- State externalized to files
- Semantic conditions for loops/gates

**Advanced:**
- In-memory state → `.review/`, `.rotation/` directories
- Attacker/Defender → `[[red-team]]`, `[[defend]]` skills
- Boolean outcomes → Semantic questions "did X happen?"

### Philosophy Validated
The refactored examples show logic that is **impossible to write in Python but trivial in MDZ**:
- `/appropriate attire for conditions/` - captures infinite nuance
- `/actively misleading users/` - judgment, not algorithm
- `/did attacks substantially weaken the proposal?/` - semantic evaluation
