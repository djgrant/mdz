# Phase 3 design

Phase 2 ended on a null that attacks MDZ's premise: content-matched prose rules matched the
MDZ procedure on every compliance metric. Phase 3 hunts for the regimes where procedural
form earns its keep. The bet: form pays when execution acquires state – when the model must
know not just what the constraints are but where it is. Questions live in ../RESEARCH.md;
direction notes in ../RESEARCH-NOTES.md.

## Layout and code policy

```
research/
  src/                 shared library: parser/validator, interpreter, scoring, CLI runners
  phase-2/             frozen artefacts; reproduce from git history, never from living code
  phase-3/
    DESIGN.md          this file
    src/               phase-3 experiment code (generators, harness extensions, scoring)
    programs/          generated programs, skills, fixtures, manifests (committed)
    results/           JSONL records + captured transcripts
    analysis/          build script + HTML report (the deliverable)
```

Phase-2 conventions carry over unchanged: manifest entries drive the harness, runners are
resumable by id with a `--max-calls` guard, traces are captured by the harness (MCP tool
logs, session transcripts, sandbox diffs) and never self-reported, and the analysis is a
self-contained HTML report.

## Experiments

### E1 – kill-and-resume (flagship)

An agent died twelve steps into a twenty-step runbook. A fresh session, with no memory of
the first, must finish the job. The claim under test: a trace is only interpretable
against a program. "Refund issued at 14:02" means nothing on its own; against a procedure
it means "step 12 done, resume at 13". Prose rules have no positions, so the resuming
model must re-infer intent from side effects.

**Variants** (content-matched, the E4 discipline – no strawman):

- `A-procedure` – the runbook as an MDZ procedure: ordered steps, `$item` lists, a
  `FOR ... END` loop over every repeated group (refund+email per order, deploy+verify per
  environment), and an `IF ... END` guard where a step is conditional. Loop obligations are
  stated once in the body; the item list carries the per-item data
- `C-rules` – the same obligations as prose policy: everything that must happen, every
  ordering constraint, stated declaratively, one per-item bullet (loop iterations spelled
  out explicitly). Where A has a conditional guard, C states the same condition in prose

**Scripted partial execution.** The kill is not the interesting part, so no model runs the
first half. The harness fabricates the pre-kill world deterministically: it performs the
first k steps' side effects itself (files written, mock-tool state mutated) and emits the
raw event log those steps would have produced. Reproducible, controlled, and every variant
resumes from an identical world.

**Form-neutral evidence.** The event log is raw harness events – tool name, arguments,
timestamp. No step numbers, no references to either artefact; a log that says "completed
step 12" would presuppose the procedure and rig the comparison. Two evidence levels:

- `log` – full event log plus the working directory
- `fx` – side effects only (the working directory and mock-tool state; no log)

If the procedure's advantage grows as evidence thins, position matters most when
reconstruction is hardest – and the metric reads it off directly.

**Tasks.** Handwritten runbooks (~20 steps) whose side effects flow through mock MCP tools
(tickets, refunds, emails, deploys) so every action lands in a log the scorer owns. Steps
interleave idempotent actions with side-effectful ones; the correct resumption is
unambiguous under the reference. The reference enumerates the UNROLLED steps – loop
iterations expand to per-item steps in order. Two kill points per task (early ~1/3, late
~2/3); wherever a kill region overlaps a loop, the kill lands mid-loop-iteration – e.g.
billing-incident's late kill falls after ORD-5502's refund and before its customer email –
so the resuming model must locate itself inside an unrolled iteration, the sharpest
position test.

| Metric | Definition |
|---|---|
| resumption accuracy | first side-effectful action taken is the reference next step |
| repeat rate | side-effectful actions re-executed that the pre-kill world already performed |
| skip rate | reference remaining steps never executed |
| completion | run ends with all remaining steps done, in a reference-valid order |

Repeat rate is the headline: "the notation is what stops the agent refunding twice".
Scoring is deterministic – the resume session's mock-tool log against the reference
remaining-step set. Cells: 4 tasks x 2 variants x 2 evidence levels x 2 kill points x
2 models (haiku, sonnet) x n=3 = 192 agentic runs.

### E2 – map-reduce under divergence

Phase 2 tested map-reduce with toy consumers; spawn fidelity was the whole result. E2 asks
whether the skill's real shape – diverge across alternatives, then select – produces work
a single context does not. Two selection regimes: a benchmark (objective) and a judge
(subjective). Both compare an MDZ consumer skill against a content-matched prose slash
command, invoked identically in the harness sandbox; the delta cannot then be attributed
to invocation mechanics. Prose variants state the same strategies and the same
explore-then-select plan, and are free to fan out with subagents – the question is whether
they do.

#### E2a – optimise (objective selection)

A slow-but-correct target program with a test suite and a benchmark, built with headroom
in several directions (algorithm, caching, data structure, I/O batching).

- `/optimise` – MDZ consumer skill driving `map-reduce.mdz`: `$items` = five strategy
  hints, one worker per strategy, `$reduce` = run tests and benchmark on every candidate,
  ship the fastest that passes
- `/optimise-goal` – the same five hints and the same plan, as prose instructions

Headline metric: speedup of the shipped solution, scored by the harness re-running the
benchmark (the model's own numbers are not trusted). Mechanism metrics from the trace:
spawn count, distinct strategies pursued, whether the prose variant fanned out or tinkered
sequentially. A tie on outcome splits informatively: tied-by-fanning-out means form is
irrelevant and content suffices; tied-by-iterating means single-context iteration matches
best-of-N, the more uncomfortable finding. Cells: 2 targets x 2 variants x 2 models
(haiku, sonnet) x n=3 = 24 agentic runs.

#### E2b – simplify (subjective selection)

The consumer skill compounds: three directional heuristics fan out per iteration, an inner
reduce picks or merges, the winner seeds the next iteration, and a spawned fresh-context
judge picks the best iteration at the end – the winner need not be the last, because
simplification overshoots.

```markdown
$heuristics = ["make it more direct", "make it more obvious", "make it smaller"]
$code = the contents of $file
$iterations = []

FOR $i IN [1 .. $n]
  $simplified = USE ~/skills/map-reduce
  WITH
    worker: general
    items: $heuristics
    map: Simplify this code, pushing in one direction: {$item}. ...
    reduce: Pick the candidate that most improves the code ... Return one file.
  Append $simplified to $iterations
  $code = $simplified
END

$winner = SPAWN general
WITH
  instruction: Compare these versions ... The winner need not be the last.
  iterations: $iterations

RETURN $winner
```

The judge spawn is load-bearing twice over: the coordinator has watched every iteration
and would anchor on the trajectory, and the spawn itself is a scored behaviour – did the
coordinator delegate the verdict or shortcut it inline.

Targets: over-abstracted modules with passing test suites. Comparison: `/simplify` (the
skill, n=3 iterations) vs `/simplify-goal` (same heuristics and plan in prose). Outcome
scored by pairwise LLM judge (sonnet), order counterbalanced, both outputs presented with
the original – the setup phase 2 validated. Mechanism metrics: spawn fidelity per
iteration, judge-spawn presence, winner-index distribution (winners consistently mid-
sequence is a finding about iterative self-editing on its own). Tests must still pass;
a failing candidate loses regardless of the judge. Cells: 2 targets x 2 variants x
2 models x n=3 = 24 agentic runs + judge calls.

### E3 – external state at breakdown sizes

Phase 2's E3b showed the store carries real signal across a context boundary but could not
show rescue: at sizes 100 and 200 the whole-context baseline does not degrade, so the
store only had overhead to demonstrate. E3 re-runs the same three arms – `internal`
(whole-context), `chunked-store`, `chunked-nostore` – at 400 and 800 statements, where
phase 1 puts the internal baseline past its cliff. The open question is exactly Q5: when
whole-context execution genuinely breaks, does load-bearing external state extend the
ceiling, or does chunking overhead swamp the rescue? Generator, chunking (~25-statement
chunks at block depth 0), and scoring (emit LCS, set-log assigns) carry over from phase-2
e3b unchanged; only the sizes are new. Cells: 2 sizes x 2 seeds x 3 arms x n=3 x haiku
= 36 runs.

### Held in reserve

Deviation detection – can a checker diff a captured trace against the artefact and flag an
injected fault – is the audit-substrate bet, and becomes the flagship only if E1 comes
back null. Not built in this phase.

## Result records

Phase-2 schema unchanged: `transcriptPath`, `spawns`, `toolCalls`, `judge`, plus phase-3
fields where an experiment needs them (`killPoint`, `evidence`, `benchmarkMs`,
`winnerIndex`). Budget: ~280 agentic runs + judge calls, haiku-dominated; sonnet where the
task needs real coding.

## The report

Same deliverable discipline as phase 2: a self-contained HTML report, every metric defined
at first use, mechanisms stated with findings, limitations first-class, and per-experiment
verdicts that answer the RESEARCH.md questions directly.
