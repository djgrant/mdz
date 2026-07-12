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

### Deferred

- Local weights and KV-cache state injection – kept out of phase 2.
- The prose ledger – ruled out by phase 1.
