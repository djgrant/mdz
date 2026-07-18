# Research notes

Working notes on the direction of each phase. RESEARCH.md holds the questions. Each phase folder holds its own DESIGN.md, programs, results, and analysis; `src/` is shared infrastructure that evolves across phases.

## Phase 1 – can models execute MDZ?

Contrived, world-free programs, scored exactly against a reference interpreter.

- Notation is robust except for one cliff: removing block delimiters entirely collapsed step accuracy from 0.997 to 0.419. Casing, indentation-as-delimiter, and type annotations stayed within noise.
- Models never halted on malformed programs – they repaired (7/10) or improvised (3/10). Type mismatches were coerced silently.
- Breakdown is driven by statement count, past ~100 statements. Nesting depth and loop iterations had no effect in range.
- Procedures steer output. The MDZ variant satisfied a non-default constraint 90% of the time; the goal-prompt variant 0%.
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
- **External state store.** A harness-side `state` tool (`get`/`set`) replacing the abandoned prose ledger. Two variants: internal execution vs tool-backed state, at sizes past the phase 1 ceiling. The `set` call log doubles as an assign trace, captured mechanically. Metrics: accuracy at size, and token cost of the round-trips.
- **Real-world procedure vs goal (Q3 flagship).** Tasks where the model's default is plausible but non-compliant – a refund policy that differs from common-sense fairness, a review checklist that flags what models skip by default. Deterministic checkers on the decision; judge on process adherence.

### Failings

Found after the phase-2 report was written; each weakens a headline claim.

- **E1's syntax result is confounded.** The strict preamble demands every statement be "syntactically well-formed", but the model is never given the grammar – only "MDZ is a simple imperative notation" and one worked example. A model cannot halt on a missing `IN` when nothing told it `FOR` requires one. The type result survives (a type fault is self-contradictory without a spec); the syntax half needs re-running with the grammar in the preamble before "repair happens inside reading" can be claimed as the mechanism.
- **E4 confounds form with content.** Variant B's prompt is "handle the refund request fairly and helpfully" – the policy content (the 14-day rule, the goodwill prohibition) appears nowhere in it. So 18/20 vs 7/20 shows models cannot comply with a policy they were never shown, which is trivially true. The Q3 verdict ("procedures steer, not relabel") is not supported by this design. The missing variant gives the same requirements declaratively – "refunds only within 14 days; no goodwill gestures; handle the request" – and tests whether the step-by-step form adds compliance beyond the content, i.e. whether the model shortcuts a stated constraint when not walked through it.
- **E2's lambda probe tested the wrong thing.** `PATTERN-BLUE-VERIFICATION` – a codephrase with no referent – read as an injection marker, so haiku's workers refused and aggregation scored 0. Binding fidelity and worker compliance were confounded; an innocuous marker phrase separates them.
- **One checker graded fidelity as violation.** The hiring-screen regex forbade `/shortlist/i`, and both models echoed the procedure's own "must not be shortlisted" warning. Decisions were 20/20; the 18/20 headline is a grader artefact, and other checkers may harbour subtler versions.
- **E3 could not answer Q5.** Models journalled a quarter of assignments, so the design measured compliance with a recording instruction rather than whether external state extends size. Informative as a negative, but the size question stays open.

### Re-runs (addressing the failings)

Each failing above was re-run or re-scored; several headline claims changed.

- **E1 deconfounded (grammar in the preamble).** With the grammar stated, strict mode halts 10/10 on syntax faults and 10/10 on type faults, with 0/10 false halts on clean programs and no accuracy tax (0.994 vs 0.989 default). Default mode with the grammar still repairs (9/9 completed runs; one timeout, zero halts) – knowing the grammar does not change behaviour; the strict directive does. Enforcement can live in notation, but only when the spec is in context. (A first attempt omitted "frontmatter is host text" from the grammar block and gpt falsely halted on `---` 5/10 – the grammar you state is the grammar they enforce.)
- **E4 verdict flipped: content steers, not form.** The new C variant (same rules stated declaratively, content-matched to the procedure) matches the MDZ procedure exactly: decisions 66/66 vs 66/66 (B-goal 25/66), judge adherence 2.00 vs 1.97 – at every interaction depth including the new depth-3 `return-eligibility` task (ordered gates, precedence, exception-to-exception). Models do not shortcut a stated constraint at these depths; the phase-2 "procedures steer" result was carried entirely by policy content. The case for procedural form must rest elsewhere: accountability, traces, composition – not compliance.
- **E2 deconfounded.** With an innocuous marker replacing `PATTERN-BLUE-VERIFICATION`: lambda binding 100% and aggregation 100% in every run that spawned workers, zero refusals. The old aggregation-0 was worker refusal, not a binding failure. Haiku still misroutes SPAWN in 2/3 runs (payload lands in todo-tool items, not Task workers; sonnet spawns 3/3) – the delegation-fidelity finding survives as misrouting, the binding one reverses.
- **Checkers re-scored, three artefact classes fixed.** Forbid patterns are now split into absolute (mention violates, e.g. disclosing a cap) and affirmative-only (negation-aware, so "I'm unable to offer a goodwill credit" is not a violation); the decision line matches inline as a fallback; curly apostrophes normalise. Hiring-screen procedure decisions were 20/20 all along. Echo-regression fixtures pin the behaviour in tests.
- **E3b: the store made load-bearing.** Programs split into ~25-statement chunks, one spawned worker per chunk, the store the only cross-chunk channel, plus a no-store control. The store beats guessing (emit accuracy 1.0 vs 0.94 at size 100; 0.82 vs 0.78 at 200) and the set log now yields a mechanical assign trace (0.68 at 100, 0.41 at 200). But chunked+store at 200 is *worse* than whole-context internal execution (0.82 vs 1.0 emits) – external state carries real signal across a context boundary yet does not extend the ceiling. Caveat: at these sizes the internal baseline's emits do not degrade, so E3b currently bounds the store's overhead; testing rescue at true breakdown sizes (400+) is the follow-up.

### Deferred

- Local weights and KV-cache state injection – kept out of phase 2.
- The prose ledger – ruled out by phase 1.
- E3b at sizes past 400, where the whole-context baseline actually breaks. (Done in phase 3.)

## Phase 3 – where does procedural form earn its keep?

Phase 2 ended on the content-vs-form null. Phase 3 bet that form pays when execution
acquires state – when the model must know where it is, not just what the constraints are.
300 runs; report in phase-3/analysis/report.html.

- **E1 (kill-and-resume): form helps, capability dominates, and evidence level decides.**
  A fresh session resuming a half-executed 20-step runbook from a form-neutral trace.
  Sonnet with the full event log is perfect under BOTH forms (resume 1.0, repeat 0.0) –
  the whole procedure advantage lives where evidence thins to side effects only
  (resume 0.71 vs 0.58, repeat 0.29 vs 0.42). Haiku largely cannot resume either way,
  but the failure modes split by form: procedure yields repeat-but-finish (skip 0.07,
  completion 0.69), prose yields skip-and-abandon (skip 0.21, completion 0.48). The
  smoke-run's dramatic double-refund contrast did not survive n=192; the honest claim is
  a consistent, modest edge that grows as evidence gets poorer.
- **E2 (diverge-then-select vs ralph loop): the ralph loop won both regimes, decisively.**
  Objective (optimise, benchmark-selected): ralph medians 111x/81x vs the MDZ map-reduce
  skill's 1.8x/3.9x and prose-goal's 1.3x/2.7x, all runs passing tests. Subjective
  (simplify, pairwise judge): ralph 9–3 over the skill and 9–3 over goal; goal even edged
  the skill 7–5. Three fresh single-minded passes beat one structured session in both –a
  single session declares victory after one round of improvements; a fresh context resets
  the ambition threshold. Caveat: ralph spends 2–5x the tokens, but nothing stopped the
  single-session arms continuing – they chose to stop. Also: every sonnet skill run
  shortcut the pipeline after iteration 1 ([3,0,0] spawns, judge never spawned); haiku
  followed the shape more faithfully than sonnet.
- **E3 (state at breakdown sizes): rescue confirmed – Q5 closes positive.** At 400
  statements all arms hold (~0.92–1.0 emits). At 800 the whole-context baseline collapses
  (0.537 emits; 2/6 runs complete, the rest cover 16–48% of the trace) while
  chunked-store holds 0.975; chunked-nostore falls to 0.441. Load-bearing external state
  extends the execution ceiling past where a single context breaks, at ~3x wall time. The
  mechanical assign trace stays mediocre (0.37–0.43) – workers execute correctly without
  journalling faithfully.

Cost: ~$300 of session usage across 300 runs, e2b's sonnet pipelines dominating.

### Deferred from phase 3

- A real-world E2 target (the synthetic fixtures cap ecological validity).
- Deviation detection – the audit-substrate bet – still unbuilt; E1's positive result
  means it was not needed as a fallback flagship.
- Matched-budget ralph vs skill (ralph at 1 pass, or skill at 3x budget) to separate
  fresh-context effects from compute effects.
