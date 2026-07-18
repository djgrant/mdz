# MDZ Benchmark Results

Answers the five research questions in `../../RESEARCH.md` from the JSONL records in `../results/`, using the experiment design in `../DESIGN.md`. All analysis here is offline: it re-scores stored model traces against reference traces and applies deterministic checkers. No model is called.

Every metric is defined the first time it appears.

## Methods

**Data loading and dedup.** Failed runs were retried and re-appended to the JSONL files, so a record `id` can appear more than once. We load each file and keep the **last** record per `id` (last write wins). Record schema is defined in `../DESIGN.md`.

**Scores.** Each record carries `scores.exact` (1 if the model trace equals the reference after normalisation, else 0), `scores.stepAccuracy` (longest-common-subsequence length / reference length), `scores.firstDivergence` (index of first mismatching step), and for Q4 `scores.paramFidelity`. Q3 is not trace-scored; it uses per-task output-constraint checkers defined in that section. Normalisation trims strings and compares numbers numerically (a number and its string form are equal).

**Uncertainty.** Where a cell has n≥3 runs we show the standard error of the mean (SEM = sample sd / √n) as error bars. n is small (5 for default cells, 3 for anchors), so treat error bars as indicative.

### Run counts and cost (higher n is better; lower spend is better)

Records per experiment after dedup, and total spend (dollar cost is recorded for Claude models only; the Codex/`gpt-*` runs report token counts but `costUsd` is null).

## Q1 — Notation features

Fixed size (40 statements), one notation feature varied at a time against the canonical baseline; n=5 per (notation × model), both cheap models. We look at error rate in two ways: mean **step accuracy**, which measures how much of the trace survived even when the run was not perfect, and **exact-match rate**, which counts only the runs whose trace was a perfect match.

Casing, indentation-as-delimiter, and type annotations all stayed within noise of canonical (0.98–1.00 step accuracy). Removing block delimiters entirely (`delimiter-none`: no `END`, no indentation) is the one exception: mean step accuracy collapsed from **0.997** (canonical) to **0.419**. Without `END` or indentation the model cannot recover block structure.

Type-annotation mismatches did not lower step accuracy (0.98), but exact-match rate dropped to 0.5 versus 0.7 canonical. The mismatch was absorbed silently — a coercion, not a flagged error.

Malformed programs were never halted on. Models repaired 7/10 and improvised 3/10; none rejected the input.

**Conclusion (Q1).** Notation robustness is high, with one sharp exception: dropping block delimiters causes step accuracy to collapse. Indentation used as the delimiter is as safe as an explicit `END`. Keyword casing makes no difference. For a prompt author, this means keeping a delimiter of either form, and not relying on the model to reject malformed or mistyped input.

## Q2 — Size and structure

Three one-dimensional sweeps from a common base: statement count {10,25,50,100,200}, nesting depth {1,3,5}, loop iterations {5,25,100}. Default cells use the two cheap models (n=5); the size-25 and size-100 anchors additionally ran sonnet, opus, gpt-5.5 (n=3).

On the cheap default models, step accuracy holds ≥0.99 through 100 statements and falls to **0.919** at 200. Nesting depth (1→5) and loop iterations (5→100) stay ≥0.99 throughout, at any statement count tested.

### Opus anchor: a trace-format lapse, not a wrong execution

At the size-100 anchor, opus scores look poor on the standard metric. On 2 of 3 size-100 runs opus emitted only `emit` steps and dropped every `assign` step from its JSON trace. The `emit` steps that remain are perfectly correct.

We show both: the standard **full step accuracy**, and an **emit-only step accuracy** (LCS restricted to `emit` steps, comparing the model's emits against the reference filtered to emits). Filtered to emits, opus's size-100 execution is 1.0 — the model executed the program right and only mis-formatted the output.

**Conclusion (Q2).** Execution accuracy was driven by statement count, and only once that count passed roughly 100 statements. Nesting depth and loop iteration count did not lower accuracy at any of the sizes tested. Two things follow. First, any limit set in the design rule should be a limit on statement count, not on nesting depth. Second, execution correctness and trace-format compliance should be scored separately, since the opus anchor shows a run can execute correctly while still failing the trace-format check.

## Q3 — Procedure versus goal

10 hand-written tasks (`../src/generator/q3-tasks.ts`). Each has a non-default **constraint** and two arms sharing the same input: **arm A** spells out the procedure as MDZ; **arm B** gives only the high-level goal. We score whether the output *satisfies the constraint* (0/1) with a deterministic per-task checker.

The procedure-arm answer is the `emit` value(s) from the parsed trace (falling back to raw output). The goal-arm answer is the raw output.

Two checkers use documented heuristics and are flagged: **one-syllable-summary** estimates syllables by counting vowel groups (no dictionary); **exactly-five-words** and **questions-only** rely on regex sentence splitting.

Across 10 tasks × 2 models, the MDZ-procedure arm satisfied the non-default constraint on 18/20 runs (**90%**). The goal-only arm satisfied it on 0/20.

The goal arm converged on model defaults every time. Two examples:

| Task | Requested | Goal arm produced | Procedure arm produced |
|---|---|---|---|
| "encode so it is not immediately readable" | ROT13 | base64 (both models) | correct ROT13 |
| "rewrite more clearly" | reversed word order | lightly paraphrased sentence | reversed word order |

The two procedure-arm misses were pig-latin and rot13, one model each — mechanical string transforms the model executed imperfectly, not defaults it fell back to.

**Conclusion (Q3).** When the model executed the procedure faithfully, the output satisfied the constraint. When it was given only the goal, the output matched the model's default style instead, regardless of the constraint asked for. Spelling out the procedure changed what the model produced; describing the goal alone did not.

## Q4 — Parameter binding across depth

Module trees with call depth {1,2,3,4}, 3 parameters per boundary, n=5, two cheap models. New metric: **parameter fidelity** = fraction of `call` steps whose argument values match the reference exactly. We read it alongside exact-match and step accuracy, to separate "called the right thing with the right args" from "produced the right overall trace".

Parameter fidelity is 0.9–1.0 at call depth 1–3 and slips to **0.8** at depth 4. Step accuracy stays ≥0.97 across all four depths.

Exact-match drops below the shallow-depth level (0.7) at depth 4 for the first time. Because step accuracy stays high even there, a wrong binding is a localised argument error — not a collapse of the whole trace.

**Conclusion (Q4).** Parameters bind faithfully at shallow call depth, and accuracy falls off slowly as depth increases. Error does compound with depth, but slowly: depth 4 is the first depth tested where fewer than half the runs are an exact match. On the cheap models tested, reliable composition holds up to about 3 call boundaries deep.

## Q5 — State ledger versus internal execution

Large programs (100 and 200 statements). **Arm A** executes internally; **arm B** maintains an explicit state-ledger block after every step (external state, but held in context). n=5, two cheap models. **Timeouts and errors count as failures** (exact=0, step accuracy=0). We compare accuracy *and* cost (completion tokens for both providers; dollar cost for Claude only).

Scope note: this is an *in-context* ledger. True KV-cache state injection needs local weights and is out of scope for this run (see Limitations).

At size 100 the two arms are indistinguishable on accuracy: 0.996 internal vs 0.989 ledger. At size 200 the ledger arm is worse: 0.997 internal vs **0.834** ledger.

The extra bookkeeping inflated output length past the time budget. Every timeout in the experiment was a size-200 ledger run, including one haiku run that failed even at a 10-minute limit.

The ledger arm spent ~1.7× the completion tokens and ~2.2× the Claude dollars for that negative return.

**Conclusion (Q5).** Maintaining a state ledger in context did not let the cheap models execute longer programs, and it cost more in tokens and dollars than not maintaining one. Writing state back into the context as prose is not, on this evidence, a useful way to help a cheap model execute longer programs. This result says nothing about true KV-cache state injection, which is a different mechanism and was out of scope for this run.

## Summary

- **Q1.** Only one notation change breaks execution: removing block delimiters (0.997 → 0.419 step accuracy). Casing, indentation-as-delimiter, and type annotations are noise-level. No model halts on malformed input; models repair or improvise instead.
- **Q2.** Statement count breaks execution past ~100 (0.919 at 200); nesting depth and loop iterations don't move the needle. Opus's poor size-100 score is a trace-format lapse (emit-only accuracy is 1.0), not a wrong execution.
- **Q3.** MDZ procedures satisfied the non-default constraint on 90% of runs; goal-only prompts satisfied it on 0% of runs. Spelling out the procedure changed the output produced, not just how that output was described.
- **Q4.** Parameter binding is 0.9–1.0 through call depth 3 and slips to 0.8 at depth 4, while step accuracy stays ≥0.97 throughout — error compounds with depth, but slowly.
- **Q5.** An in-context state ledger gives no accuracy gain (and a loss at size 200: 0.834 vs 0.997), spends ~1.7× the tokens and ~2.2× the dollar cost, and produced every timeout in the experiment.

## Limitations

- **Small n.** Default cells are n=5 and anchor cells n=3. SEM bars are shown but with this few samples they are indicative only; single-run noise can move a cell.
- **Two cheap models carry most cells.** Every cell ran haiku and gpt-5.4-mini; sonnet, opus and gpt-5.5 appear only at the Q2 size-25/100 anchors (n=3). Cross-model claims outside those anchors are not supported.
- **Q5 tests an in-context ledger, not KV-cache injection.** Per `../DESIGN.md`, true external state written into the KV cache requires local weights and was out of scope. The Q5 result bounds only the prose-ledger strategy; it says nothing about genuine KV-cache state.
- **Opus trace-format caveat.** On 2/3 size-100 runs opus dropped `assign` steps from its JSON trace while executing correctly. The standard step-accuracy metric penalises this as if it were an execution error; the emit-only recomputation shows the underlying execution was correct (1.0). Trace-format compliance and execution correctness are distinct and should be reported separately.
- **Timeout handling.** Timed-out and errored runs are scored as failures (exact=0, step accuracy=0). This is conservative: a run that would have finished correctly past the time limit is counted as wrong. All such failures fell in the Q5 size-200 ledger arm.
- **Q3 heuristic checkers.** Syllable counting uses a vowel-group estimate (no pronunciation dictionary) and the five-words / questions-only checkers rely on regex sentence splitting. These can misjudge edge-case outputs; the affected checkers are flagged inline.
