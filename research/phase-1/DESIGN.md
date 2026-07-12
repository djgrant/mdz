# MDZ Benchmark Design

Answers the five questions in ../RESEARCH.md by generating random MDZ programs, computing
reference traces with a deterministic interpreter, having models execute the programs, and
scoring model traces against the reference.

## Directory layout

```
research/
  package.json         workspace package "@mdz/benchmark" (TypeScript, vitest)
  src/                 shared infrastructure, evolves across phases
    generator/         random program generator (seeded, parameterised)
    interpreter/       reference interpreter -> canonical trace
    harness/           model runners (claude CLI, codex CLI), scoring, recording
  phase-1/             frozen phase artefacts (scripts take --phase, default phase-1)
    DESIGN.md          this file
    programs/          generated programs + reference traces (committed artefacts)
    results/           JSONL result records, one file per experiment run
    analysis/          Jupyter notebook + built HTML presenting results
```

## Program design

Generated programs are self-contained MDZ documents that require no tools and no world
knowledge. Statements operate on integer and string literals so the correct trace is
fully determined. Observable actions are:

- `EMIT <expr>`-style prose instructions ("Say the value of $x") — every observable step
  appends one line to the trace
- variable assignments (`$x = ...`)
- control flow: `IF/ELSE`, `FOR ... IN`, `WHILE`, `CASE`, and (Q4) `USE`/`SPAWN` with
  `WITH` parameter blocks across module files

The model is instructed to execute the program and print its trace as fenced JSON lines.

## Canonical trace format (shared contract)

The reference interpreter and the model both produce a trace: a JSON array of steps.

```json
{ "step": 3, "action": "emit", "value": "42" }
{ "step": 4, "action": "assign", "var": "x", "value": 7 }
{ "step": 5, "action": "call", "target": "skills/format", "args": {"n": 7} }
```

Only `emit`, `assign`, and `call` steps are scored (control-flow decisions are implicit in
which observable steps occur). Values are JSON scalars. String comparison is
whitespace-trimmed, numbers compared numerically.

## Scoring

- `exact`: 1 if model trace equals reference trace (after normalisation), else 0
- `stepAccuracy`: length of longest common subsequence of steps / reference length
- `firstDivergence`: index of first mismatching step (null if none)
- Q3 uses output-divergence instead (see below); Q4 additionally scores `paramFidelity`:
  fraction of `call` steps whose args match reference exactly

## Result record schema (JSONL, one object per model run)

```json
{
  "id": "q2-stmt050-seed3-haiku-r1",
  "experiment": "q2",
  "programPath": "programs/q2/stmt050-seed3.mdz",
  "variant": {"notation": "canonical", "statements": 50, "depth": 1, "iterations": 10},
  "provider": "claude" | "codex",
  "model": "haiku" | "sonnet" | "opus" | "gpt-5.4-mini" | "gpt-5.5",
  "promptTokens": 0, "completionTokens": 0, "costUsd": null,
  "startedAt": "...", "durationMs": 0,
  "rawOutput": "...", "parsedTrace": [...], "parseError": null,
  "scores": {"exact": 0, "stepAccuracy": 0.94, "firstDivergence": 17},
  "error": null
}
```

Runners must be resumable: skip ids already present in the results file. A `--max-calls`
budget guard aborts the run when exceeded.

## Experiment matrix (credit-conscious)

Default models: **haiku** and **gpt-5.4-mini** for all cells. **sonnet**, **opus**,
**gpt-5.5** only at anchor cells (canonical notation, sizes 25/100) with n=3.

| Exp | Question | Factors | Cells x n |
|-----|----------|---------|-----------|
| q1  | notation -> error rate | keyword casing (CAPS/lower), delimiter (END/indent/none), type annotations (none/annotated/enforced), malformed handling (halt/repair) — one factor at a time vs canonical baseline, fixed size 40 stmts | ~9 variants x n=5 x 2 models |
| q2  | size -> breakdown | statements {10,25,50,100,200} at depth 2; depth {1,3,5} at 50 stmts; loop iterations {5,25,100} at 50 stmts | ~11 cells x n=5 x 2 models + anchors |
| q3  | procedure vs goal | 10 handwritten tasks with a non-default procedure; arm A: MDZ procedure, arm B: goal-only prompt. Score: procedure adherence (trace) + qualitative divergence of outputs | 10 x 2 arms x 2 models |
| q4  | cross-module binding | module trees, call depth {1,2,3,4}, 3 params per boundary | 4 x n=5 x 2 models |
| q5  | external state | large programs (100/200 stmts), arm A: internal execution, arm B: model maintains explicit state-ledger block after every step (external-state-in-context). True KV-cache injection requires local weights — out of scope here; documented as such | 2 sizes x 2 arms x n=5 x 2 models |

Total ≈ 400 calls, dominated by haiku/gpt-5.4-mini on short programs.

## Model invocation

- Claude: `claude -p --model <model> --output-format json` (gives usage + cost), no tools
  (`--allowedTools ""`), single turn.
- Codex: `codex exec -m <model> --json` single turn, sandboxed read-only.

Temperature is provider-default; determinism comes from scoring n samples per cell.
