# Phase 2 design

Phase 1 asked whether models can execute MDZ. Phase 2 asks whether notation can make them
execute it accountably: real-world-shaped programs, executed agentically, with traces
captured by the harness rather than reported by the model. Questions live in
../RESEARCH.md; direction notes in ../RESEARCH-NOTES.md.

## Layout and code policy

```
research/
  src/                 shared library: parser/validator, interpreter, scoring, CLI runners
  phase-1/             frozen artefacts; reproduce from git history, never from living code
  phase-2/
    DESIGN.md          this file
    src/               phase-2 experiment code (generators, harness, judge)
    programs/          generated programs, skills, manifests (committed)
    results/           JSONL records + captured transcripts
    analysis/          build script + HTML report (the deliverable)
```

Shared `src/` is a library serving the current phase. Experiment definitions, prompt
construction, and run orchestration live in the phase folder. The phase-1 entry points
(`src/generate-programs.ts`, `src/harness/run-experiment.ts`) are superseded by phase-2
equivalents and retained untouched for reference.

## Trace capture

Three sources, none self-reported:

1. **Session transcripts.** `claude -p --output-format json` returns a `session_id`; the
   full transcript is JSONL under `~/.claude/projects/<munged-cwd>/<session_id>.jsonl`.
   `Task` tool_use entries are SPAWN events (subagent type + full prompt = the WITH
   payload). The runner copies each transcript into `results/transcripts/`.
2. **MCP tool calls.** A mock stdio MCP server (`state`: `get`/`set`) appends every call
   to a log file per run. `set` calls double as an assign trace. Transcript tool_use
   entries cross-check the server log.
3. **Canary tokens.** Hybrid programs thread unique tokens through the data flow (each
   map item carries one). Token presence in worker prompts and final output makes fan-out
   coverage and aggregation deterministic to score, with no judge needed.

Single-turn experiments (E1, E4) keep phase-1-style output scoring where it is the thing
being measured (halt behaviour, final decision) — the self-report confound does not apply
to them because no intermediate trace is scored.

## Experiments

### E1 — strict mode

Can a directive flip silent repair into halting? Programs at 40 statements from the
phase-1 canonical generator, three integrity conditions:

- `clean` — no fault
- `syntax-fault` — one mangled construct (e.g. `FOR` header missing `IN`)
- `type-fault` — one annotation contradicted by its value, used downstream

Two modes: default, and `PRAGMA STRICT` as the first MDZ statement. The shared executor
preamble defines strict semantics in two lines (validate before executing; on any syntax
or type violation, emit a single `{"action": "halt", "reason": ...}` step and stop).
Default mode gets no guidance about faults, matching phase 1.

| Metric | Definition |
|---|---|
| halt rate | faulted runs whose trace is a single well-formed halt step |
| false-halt rate | clean runs that halt |
| repair rate | faulted runs that execute through the fault (phase-1 behaviour) |
| strictness tax | step-accuracy delta, strict vs default, on clean programs |

Cells: 2 modes x 3 conditions x 5 seeds x 2 models (haiku, gpt-5.4-mini) = 120 calls.
Reference traces come from the shared interpreter; for type-faults the reference is the
halt step (strict) or the coerced execution (default).

**Grammar amendment.** The original strict preamble demanded well-formed syntax without
stating the grammar, so the syntax half of the result was confounded: a model cannot halt
on a missing `IN` when nothing told it `FOR` requires one. A second set of cells repeats
the informative conditions with the full grammar for this program class spelled out in
the preamble — {default, strict} x {clean, syntax} plus strict x type — separating "knows
the grammar but repairs anyway" from "strict directive plus grammar halts".
5 cells x 5 seeds x 2 models = 50 further calls; ids carry a `-grammar-` segment.

### E2 — map-reduce higher-order skill

A `skills/map-reduce.mdz` skill takes `$items`, `$map`, `$reduce` and fans out one
`SPAWN` per item. Consumer programs call it; the run is agentic (`claude -p` with `Task`
allowed, skills present as files in a sandbox working directory).

Variants (4 programs, each with per-item canary tokens):

1. `inline-3` — consumer passes 3 items as an inline list
2. `inline-5` — 5 items
3. `anchor-heuristics` — a `simplify` skill binding `$items: #heuristics`, a heading in
   the consumer document listing 4 heuristics
4. `lambda-fidelity` — `$map` is a lambda whose exact wording must reach each worker
5. `lambda-fidelity-neutral` — same probe with an innocuous marker phrase
   (`reviewed-for-the-weekly-digest`). The original marker (`PATTERN-BLUE-VERIFICATION`,
   a codephrase with no referent) read as an injection marker and haiku's workers
   refused, confounding binding fidelity with worker compliance; the original variant is
   kept as the contrast case.

| Metric | Definition |
|---|---|
| spawn fidelity | spawned-subagent count / expected item count (capped at 1) |
| item coverage | items whose canary appears in exactly one worker prompt / items |
| lambda fidelity | workers whose prompt contains the `$map` instruction (string match, judge fallback) |
| aggregation coverage | item canaries present in the final output / items |
| shortcut rate | runs with zero spawns but a completed final answer |

Cells: 4 programs x 2 models (haiku, sonnet) x n=3 = 24 agentic runs.

### E3 — external state store

Replaces the abandoned prose ledger. Programs at 100 and 200 statements (phase-1 q5
generator, internal-variant prompts). Two variants:

- `internal` — single-turn, phase-1 style (the phase-1 baseline, re-run for comparability)
- `store` — agentic, MCP `state` tool available, instructed to `set` after every
  assignment and `get` before every read; no self-reported trace

Scoring: the `set` log is scored against the reference assign trace; emits are scored
from final output. Metrics: step accuracy per variant, completion tokens, wall time.
Cells: 2 sizes x 2 variants x n=3 x haiku = 12 runs (+ 2 sonnet anchors at size 200).

### E3b — load-bearing external state (Q5 redesign)

E3's store was optional: models journalled ~a quarter of assignments, so it measured
compliance with a recording instruction, not whether external state extends the size
ceiling. E3b makes the store the only channel state can flow through: the program is
split into ~25-statement chunks (never inside a block) and an orchestrator spawns one
worker per chunk, sequentially. Workers never see the rest of the program, so a variable
crossing a chunk boundary is only recoverable via `mcp__state__get`, and a skipped
`mcp__state__set` breaks later chunks — non-compliance shows up as wrong answers on the
primary metric rather than gaps in a log.

Two arms per program: `chunked-store` (workers get the state tools) and
`chunked-nostore` (same chunking, workers must guess cross-chunk values) — the control
that shows whether the store is doing the work. The e3 `internal` arm (same generator,
sizes, seeds) is the whole-context baseline. Scoring: emits from the orchestrator's
final output (LCS vs reference), assigns from the mechanically captured set log.
Cells: 2 sizes (100, 200) x 2 seeds x 2 arms x n=3 x haiku = 24 agentic runs.

### E4 — real-world procedure vs goal

Ten handwritten tasks where the model's default is plausible but non-compliant: each task
has a policy/procedure whose correct outcome differs from what a helpful model does
unprompted (refund edge cases, escalation ordering, review checklists, retention rules).
Variants share the input: **A** gets the procedure as MDZ, **B** gets the goal only,
**C** gets the same requirements as declarative rules — content-matched to the procedure
(every rule, including ordering and precedence constraints, stated as policy bullets)
but without the step-by-step skeleton. B turned out to be a strawman (it never contained
the policy content, so it showed only that models cannot comply with a policy they were
never shown); it is kept as the no-content lower bound. The Q3 comparison is A vs C:
does procedural FORM add compliance beyond policy content?

Tasks carry a constraint-interaction `depth` tag (1 = flat rules, 2 = one interaction or
ordering constraint, 3 = ordered gates with precedence and an exception-to-an-exception:
`return-eligibility`), so the result reads as a curve — the hypothesis is that
declarative compliance degrades with depth while procedural compliance holds. A null at
depth 1 is expected, not embarrassing. Prompt length cannot be matched across forms
(skeleton tokens aren't free); content parity is the control, not length.

Scoring: a deterministic checker per task on the decision/output constraint, plus an
LLM judge (sonnet) scoring process adherence 0–2 against the written procedure, order
counterbalanced. Judges are reliable at recognising compliance when both the procedure
and the output are presented, even where they would not have produced the output.
Cells: 11 tasks x 3 variants x 2 models (haiku, gpt-5.4-mini) x n=3 = 198 calls
+ judge calls. Checkers distinguish absolute forbids (mere mention violates, e.g.
disclosing a cap) from affirmative forbids (violation only outside a negated context),
so a compliant reply that echoes the prohibition — "I'm unable to offer a goodwill
credit", "must not be shortlisted" — is not graded as a violation. Echo-regression
fixtures in the generator tests pin this behaviour.

### Q2, observationally

Every result record carries size metadata (statement count, tool-call weight). The size
question is answered across the whole corpus; no dedicated programs.

## Result records

Phase-1 schema plus: `transcriptPath`, `spawns` (from transcript), `toolCalls` (from MCP
log), `canaries` (expected/found), `judge` (score + rationale). Runners are resumable by
id; a `--max-calls` guard aborts over budget. Budget: ~200 model calls + ~80 judge calls,
haiku-dominated.

## The report

The HTML report in `analysis/` is the deliverable and is written for review, not built
from notebook exports alone: self-contained single file, charts embedded as base64,
every metric defined at first use, findings stated with their mechanisms, a limitations
section, and per-experiment verdicts that answer the RESEARCH.md questions directly.
