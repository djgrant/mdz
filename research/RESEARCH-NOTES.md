# Research notes

Working notes on the direction of each phase. RESEARCH.md holds the questions. Each phase folder holds its own DESIGN.md, programs, results, and analysis; `src/` is shared infrastructure that evolves across phases.

## Phase 1 – can models execute MDZ?

Contrived, world-free programs, scored exactly against a reference interpreter.

- Notation is robust except for one cliff: removing block delimiters entirely collapsed step accuracy from 0.997 to 0.419. Casing, indentation-as-delimiter, and type annotations stayed within noise.
- Models never halted on malformed programs – they repaired (7/10) or improvised (3/10). Type mismatches were coerced silently.
- Breakdown is driven by statement count, past ~100 statements. Nesting depth and loop iterations had no effect in range.
- Procedures steer output. The MDZ arm satisfied a non-default constraint 90% of the time; the goal-prompt arm 0%.
- Parameter binding held to call depth 3 (fidelity 0.9–1.0), slipping to 0.8 at depth 4.
- A model-maintained prose ledger of state made things worse at size 200 (0.834 vs 0.997) at ~2× cost. Dropped from further research.

Two caps to fix: programs were contrived (no tools, no judgment, no world knowledge), and traces were self-reported by the model – which produced the opus dropped-`assign` confound, where a formatting lapse was indistinguishable from an execution error.

## Phase 2 – can notation make execution accountable?

Real-world-shaped programs, executed agentically, with traces captured by the harness rather than reported by the model.

### Method changes

- **The harness observes the trace.** Tool calls are recorded by a mock MCP server; subagent spawns are read from Claude Code session transcripts and codex `exec --json` event streams; world effects are read from the sandbox diff. Nothing is self-reported. Open question: `USE` (inline skill) has no natural harness event – at best it surfaces as a read of the skill file.
- **Hybrid programs.** Real procedure shapes (runbooks, review checklists, policies) with deterministic invariants threaded through the control and data flow. Fuzzy work happens at the leaves; the skeleton stays exactly scorable.
- **LLM-as-judge for the fuzzy leaves.** Models are reliable at recognising the better answer when both are presented, even where they could not have produced it. Judges score leaf outputs; the deterministic skeleton needs no judge.
- **Q2 becomes observational.** No dedicated programs. Every run records size, depth, and statement weight, and the size-ceiling answer is read off the whole corpus – including whether the ~100-statement ceiling drops when statements are heavy with tool calls.

### Experiments

- **Strict mode.** A `use strict`-style pragma demanding halt on malformed syntax, rejection of type mismatches, and no repair. A 2×2: {default, strict} × {clean, faulted programs}. Headline metrics: halt rate on faulted programs, false-halt rate on clean ones, and any accuracy tax strict mode imposes on clean execution. If a directive can flip repair to halt, enforcement can live in notation; if it cannot, enforcement moves to a validator gate in the harness.
- **Map-reduce higher-order skill.** A `~/skill/map-reduce` that takes `$items`, `$map`, and `$reduce`, fanning out via `ASYNC SPAWN`. Consumer skills call it – e.g. a `simplify` skill passing a set of heuristics listed under a heading, bound by anchor: `$items: #heuristics`. Tests four things, each scoreable from the harness trace: lambda binding across a boundary, fan-out fidelity (N spawns with N distinct items), faithful delegation vs shortcutting inline, and reduce-side aggregation. Try several consumer shapes.
- **External state store.** A harness-side `state` tool (`get`/`set`) replacing the abandoned prose ledger. Two arms: internal execution vs tool-backed state, at sizes past the phase 1 ceiling. The `set` call log doubles as an assign trace, captured mechanically. Metrics: accuracy at size, and token cost of the round-trips.
- **Real-world procedure vs goal (Q3 flagship).** Tasks where the model's default is plausible but non-compliant – a refund policy that differs from common-sense fairness, a review checklist that flags what models skip by default. Deterministic checkers on the decision; judge on process adherence.

### Failings

Found after the phase-2 report was written; each weakens a headline claim.

- **E1's syntax result is confounded.** The strict preamble demands every statement be "syntactically well-formed", but the model is never given the grammar – only "MDZ is a simple imperative notation" and one worked example. A model cannot halt on a missing `IN` when nothing told it `FOR` requires one. The type result survives (a type fault is self-contradictory without a spec); the syntax half needs re-running with the grammar in the preamble before "repair happens inside reading" can be claimed as the mechanism.
- **E4 confounds form with content.** Arm B's prompt is "handle the refund request fairly and helpfully" – the policy content (the 14-day rule, the goodwill prohibition) appears nowhere in it. So 18/20 vs 7/20 shows models cannot comply with a policy they were never shown, which is trivially true. The Q3 verdict ("procedures steer, not relabel") is not supported by this design. The missing arm gives the same requirements declaratively – "refunds only within 14 days; no goodwill gestures; handle the request" – and tests whether the step-by-step form adds compliance beyond the content, i.e. whether the model shortcuts a stated constraint when not walked through it.
- **E2's lambda probe tested the wrong thing.** `PATTERN-BLUE-VERIFICATION` – a codephrase with no referent – read as an injection marker, so haiku's workers refused and aggregation scored 0. Binding fidelity and worker compliance were confounded; an innocuous marker phrase separates them.
- **One checker graded fidelity as violation.** The hiring-screen regex forbade `/shortlist/i`, and both models echoed the procedure's own "must not be shortlisted" warning. Decisions were 20/20; the 18/20 headline is a grader artefact, and other checkers may harbour subtler versions.
- **E3 could not answer Q5.** Models journalled a quarter of assignments, so the design measured compliance with a recording instruction rather than whether external state extends size. Informative as a negative, but the size question stays open.

### Deferred

- Local weights and KV-cache state injection – kept out of phase 2.
- The prose ledger – ruled out by phase 1.
