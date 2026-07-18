# MDZ Benchmark Results

Answers the five research questions in `../../RESEARCH.md` from the JSONL records in `../results/`, using the experiment design in `../DESIGN.md`. All analysis here is offline: it re-scores stored model traces against reference traces and applies deterministic checkers. No model is called.

Every metric is defined the first time it appears.

## Methods

**Data loading and dedup.** Failed runs were retried and re-appended to the JSONL files, so a record `id` can appear more than once. We load each file and keep the **last** record per `id` (last write wins). Record schema is defined in `../DESIGN.md`.

**Scores.** Each record carries `scores.exact` (1 if the model trace equals the reference after normalisation, else 0), `scores.stepAccuracy` (longest-common-subsequence length / reference length), and `scores.firstDivergence` (index of first mismatching step). Q4 records also carry `scores.paramFidelity`.

Q3 is scored differently: it has no reference trace to compare against, so it uses per-task output-constraint checkers defined in that section.

Normalisation trims strings and compares numbers numerically — a number and its string form count as equal.

**Uncertainty.** Where a cell has n≥3 runs we show the standard error of the mean (SEM = sample sd / √n) as error bars. n is small (5 for default cells, 3 for anchor cells), so treat error bars as indicative.

**Anchor cells.** Two sweeps in Q2 (size 25 and size 100) additionally ran three extra models — sonnet, opus, gpt-5.5 — at n=3, on top of the two cheap default models used everywhere else. We call these anchor cells: they check whether the cheap-model pattern holds on stronger models, at just two sizes.

## Q1 — Removing block delimiters is the only notation change that breaks execution

Fixed size (40 statements), one notation feature varied at a time against the canonical baseline; n=5 per (notation × model), both cheap models.

We read error rate through two lenses: mean **step accuracy** (graceful — how much of the trace survived) and **exact-match rate** (strict — fraction of runs with a perfect trace).

Type annotations barely affect trace accuracy, but the exact-match rate under `annotations-mismatch` drops to 0.5 against 0.7 canonical. Mismatched annotations get absorbed silently rather than flagged as an error.

No model ever halted on a malformed program. They repaired it (7/10 runs) or improvised a continuation (3/10 runs).

Removing block delimiters altogether (`delimiter-none`) is the only feature that breaks execution: step accuracy falls from 0.997 to 0.419. Without `END` or indentation, the model cannot recover the block structure.

**Conclusion (Q1).** Indentation as the delimiter is as safe as an explicit `END`, and keyword casing makes no measurable difference. Removing the delimiter is the one change that matters.

A prompt author should keep a delimiter, in either form. The model will not reject malformed or mistyped input on its own.

## Q2 — Statement count breaks execution; structural complexity does not

Three one-dimensional sweeps from a common base: statement count {10,25,50,100,200}, nesting depth {1,3,5}, loop iterations {5,25,100}. Default cells use the two cheap models (n=5); the size-25 and size-100 anchor cells additionally ran sonnet, opus, and gpt-5.5 (n=3).

### Q2 anchor models and the opus trace-format caveat

At the size-100 anchor cell, opus scores look poor on the standard metric. The failure is a *trace-format* failure, not an execution failure: on 2 of 3 size-100 runs, opus emitted only `emit` steps and dropped every `assign` step from its JSON trace.

The `emit` steps that remain are correct, so opus executed the program correctly and only mis-formatted the output. We show both: the standard **full step accuracy**, and an **emit-only step accuracy** (LCS restricted to `emit` steps, comparing the model's emits against the reference filtered to emits).

Execution breakdown is driven by statement count, and only past roughly 100 statements. Structural complexity does not move the metric.

Filtered to emits, opus's size-100 execution scores 1.0. Its low full-trace score is a dropped-`assign` formatting lapse, not a wrong answer.

**Conclusion (Q2).** On the cheap default models, step accuracy holds ≥0.99 through 100 statements and drops to 0.919 at 200. Increasing nesting depth (1→5) or loop iterations (5→100) at fixed size leaves accuracy ≥0.99.

Two design implications follow: put a size ceiling, not a nesting ceiling, in the design rule, and score execution and trace-format compliance as two separate metrics.

## Q3 — A written-out procedure changes model output; a goal prompt does not

10 hand-written tasks (`../src/generator/q3-tasks.ts`). Each has a non-default **constraint** and two arms sharing the same input: the **procedure arm** spells out the steps as MDZ; the **goal arm** gives only the high-level goal.

We score whether the output *satisfies the constraint* (0/1) with a deterministic per-task checker. The procedure arm's answer is the `emit` value(s) from the parsed trace, falling back to raw output; the goal arm's answer is the raw output.

Two checkers use documented heuristics and are flagged: **one-syllable-summary** estimates syllables by counting vowel groups (no dictionary), and **exactly-five-words** / **questions-only** rely on regex sentence splitting.

Asked to "encode so it is not immediately readable," both models reached for base64 under the goal prompt, not the requested ROT13. Asked to "rewrite more clearly," they returned a lightly paraphrased sentence rather than the requested reversed word order. The goal arm converged on the model's own default behaviour on every run.

The two procedure-arm misses were pig-latin and rot13, one model each. Both were cases of a mechanical string transform executed imperfectly, not a fallback to the model's default.

**Conclusion (Q3).** The procedure arm satisfied the non-default constraint on 18/20 runs (0.90); the goal arm satisfied it on 0/20. Spelling out the procedure changed what the model did; the goal prompt left each model doing what it would have done by default.

## Q4 — Parameter binding degrades gradually with call depth

Module trees with call depth {1,2,3,4}, 3 parameters per boundary, n=5, two cheap models. New metric: **parameter fidelity** = fraction of `call` steps whose argument values match the reference exactly.

We read it alongside exact-match and step accuracy to separate "called the right thing with the right arguments" from "produced the right overall trace."

**Conclusion (Q4).** Parameter fidelity runs 0.9–1.0 through call depth 3 and slips to 0.8 at depth 4, while step accuracy stays ≥0.97 across all depths. When a binding is wrong, it is a localised argument error, not a collapse of the whole trace.

Error does compound with depth, but gently: depth 4 is the first cell where exact-match drops below the shallow-depth level (0.7). For reliable composition on cheap models, the practical ceiling is about 3 call boundaries deep.

## Q5 — An in-context state ledger adds cost without adding accuracy

Large programs (100 and 200 statements). The **internal-execution arm** executes internally; the **ledger arm** maintains an explicit state-ledger block after every step (external state, but held in context). n=5, two cheap models.

**Timeouts and errors count as failures** (exact=0, step accuracy=0). We compare accuracy *and* cost — completion tokens for both providers, dollar cost for Claude only.

Scope note: this is an *in-context* ledger. True KV-cache state injection needs local weights and is out of scope for this run (see Limitations).

Every timeout in the experiment was a size-200 ledger run, including one haiku run that failed even at a 10-minute limit. The ledger arm spent roughly 1.7× the completion tokens and 2.2× the Claude dollar cost for that negative return.

**Conclusion (Q5).** At size 100 the two arms are indistinguishable on accuracy (0.996 internal vs 0.989 ledger). At size 200 the ledger arm is worse (0.834 vs 0.997): the extra bookkeeping inflated output length past the time budget.

For this design, writing state back into the context as prose does not help a cheap model execute longer programs. This result does not cover true KV-cache injection, which is a different mechanism and is out of scope here.

## Limitations

- **Small n.** Default cells are n=5 and anchor cells n=3. SEM bars are shown but with this few samples they are indicative only; single-run noise can move a cell.
- **Two cheap models carry most cells.** Every cell ran haiku and gpt-5.4-mini; sonnet, opus and gpt-5.5 appear only at the Q2 size-25/100 anchor cells (n=3). Cross-model claims outside those anchors are not supported.
- **Q5 tests an in-context ledger, not KV-cache injection.** Per `../DESIGN.md`, true external state written into the KV cache requires local weights and was out of scope. The Q5 result bounds only the prose-ledger strategy; it says nothing about genuine KV-cache state.
- **Opus trace-format caveat.** On 2/3 size-100 runs opus dropped `assign` steps from its JSON trace while executing correctly. The standard step-accuracy metric penalises this as if it were an execution error; the emit-only recomputation shows the underlying execution was correct (1.0). Trace-format compliance and execution correctness are distinct and should be reported separately.
- **Timeout handling.** Timed-out and errored runs are scored as failures (exact=0, step accuracy=0). This is conservative: a run that would have finished correctly past the time limit is counted as wrong. All such failures fell in the Q5 size-200 ledger arm.
- **Q3 heuristic checkers.** Syllable counting uses a vowel-group estimate (no pronunciation dictionary) and the five-words / questions-only checkers rely on regex sentence splitting. These can misjudge edge-case outputs; the affected checkers are flagged inline.

## Summary

- **Q1.** Step accuracy holds at 0.98–1.00 for casing, indentation, and type-annotation changes. Dropping block delimiters entirely collapses it from 0.997 to 0.419. Removing block delimiters is the only notation change that breaks execution.

- **Q2.** Step accuracy holds ≥0.99 through 100 statements, then falls to 0.919 at 200. Nesting depth and loop count do not move it. Statement count breaks execution; structural complexity does not.

- **Q3.** The procedure arm satisfies its constraint on 90% of runs. The goal-only arm satisfies it on 0%. A written-out procedure changes model output; a goal prompt does not.

- **Q4.** Parameter fidelity runs 0.9–1.0 through call depth 3, then slips to 0.8 at depth 4. Step accuracy stays ≥0.97 throughout. Parameter binding degrades gradually with call depth.

- **Q5.** At size 200, the ledger arm scores 0.834 against 0.997 for internal execution, and produces every timeout in the run. It also costs 1.7× the tokens and 2.2× the dollars. An in-context state ledger adds cost without adding accuracy.
