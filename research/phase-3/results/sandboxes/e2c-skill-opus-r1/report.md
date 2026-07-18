# MDZ Benchmark Results

Answers the five research questions in `../../RESEARCH.md` from the JSONL records in `../results/`, using the experiment design in `../DESIGN.md`. All analysis is offline: it re-scores stored model traces against reference traces and applies deterministic checkers.

## Executive summary

- **Q3 — Does a faithfully executed procedure diverge from the goal baseline, or converge on model defaults?** Across 10 tasks × 2 models, the MDZ-procedure arm satisfied the non-default constraint **90%** of the time; the goal-only arm satisfied it **0%** of the time. Goal prompts converged on defaults every time — e.g. asked to "encode so it is not immediately readable", both models chose base64; the procedure arm produced correct ROT13.

## Methods

Failed runs were retried and re-appended to the JSONL files. A record `id` can therefore appear more than once. We load each file and keep the **last** record per `id`. This means last write wins. Record schema is defined in `../DESIGN.md`.

**Scores.** Each record carries `scores.exact`. This is 1 if the model trace equals the reference after normalisation, else 0. Each record also carries `scores.stepAccuracy`. This is the longest-common-subsequence length divided by the reference length. Each record also carries `scores.firstDivergence`, the index of the first mismatching step. Q4 records also carry `scores.paramFidelity`.

Q3 is not trace-scored. It uses per-task output-constraint checkers, defined in that section.

Normalisation trims strings. It compares numbers numerically, so a number and its string form are counted equal.

**Uncertainty.** Where a cell has n≥3 runs, error bars show the standard error of the mean: sample standard deviation divided by √n. n is small — 5 for default cells, 3 for anchors. Treat error bars as indicative, not precise.

### Run counts and cost

Records per experiment after dedup, and total spend. Dollar cost is recorded for Claude models only. Codex (`gpt-*`) runs report token counts but leave `costUsd` null.

## Q1 — Only removing block delimiters breaks execution; casing, indentation, and type annotations don't, and mismatched types are silently coerced, never rejected

Each test used 40 statements. We varied one notation feature at a time against the baseline notation, running each combination five times, across both cheap models.

We measured error rate two ways. First, mean step accuracy: how much of the trace survived intact. Second, exact-match rate: the fraction of runs producing a perfect trace.

**Conclusion (Q1).** Notation robustness is high except for one cliff. Removing block delimiters altogether (`delimiter-none`) breaks execution: step accuracy falls from 0.997 to 0.419. Without `END` or indentation, the model cannot recover block structure. Indentation as the delimiter is as safe as explicit `END`. Keyword casing is irrelevant.

Type annotations barely matter to trace accuracy. But under `annotations-mismatch`, exact-match rate drops to 0.5 against a 0.7 canonical rate. Mismatched annotations get absorbed silently, not flagged. This is a coercion, not an error.

No model ever halted on a malformed program. Seven out of ten repaired it; three improvised. For a prompt author, the guidance is this: keep a delimiter, either form. Do not rely on the model to reject malformed or mistyped input.

## Q2 — Execution breaks down only as statement count grows (≥0.99 through 100 statements, 0.919 at 200); nesting depth and loop iterations don't matter

### Q2 anchor — opus's low score at size 100 is a trace-format artifact (dropped assign steps), not an execution failure; emit-only accuracy is 1.0

At the size-100 anchor, opus scores poorly on the standard metric. On 2 of 3 size-100 runs, opus emitted only `emit` steps in its JSON trace and dropped every `assign` step. The scored steps that remain — the emits — are correct. The model executed the program correctly. The failure is a trace-format failure, not an execution failure.

We report both **full step accuracy** and **emit-only step accuracy**. Full step accuracy scores every step. Emit-only step accuracy restricts the LCS comparison to `emit` steps: it filters the reference trace down to `emit` steps, then compares the model's emits against that filtered list.

**Conclusion (Q2).** Execution is driven by statement count, and only past ~100 statements. On the cheap default models, step accuracy holds ≥0.99 through 100 statements and drops to 0.919 at 200. Increasing nesting depth (1→5) or loop iterations (5→100) at fixed size leaves accuracy ≥0.99.

The opus anchor confirms the metric caveat: filtered to emits, opus's size-100 execution is 1.0. Its low full score is a dropped-`assign` formatting lapse, not a wrong answer.

Two implications follow: put the size ceiling, not the nesting ceiling, in the design rule; and score execution and trace-format compliance separately.

## Q3 — A faithfully executed procedure meets the non-default constraint 90% of the time; the goal-only baseline meets it 0%, converging on model defaults instead

10 hand-written tasks (`../src/generator/q3-tasks.ts`). Each task has a non-default **constraint**. Each task has two arms sharing the same input. **Arm A** spells out the procedure as MDZ. **Arm B** gives only the high-level goal.

A deterministic per-task checker scores whether the output *satisfies the constraint*, as 0 or 1. For the procedure arm, the checker reads the `emit` value(s) from the parsed trace. It falls back to raw output where no `emit` value exists. For the goal arm, the checker reads the raw output.

Two checkers use documented heuristics and are flagged. **one-syllable-summary** counts vowel groups to estimate syllables; it has no dictionary. **exactly-five-words** and **questions-only** split sentences using regex.

**Conclusion (Q3).** A faithfully executed procedure changes the output; a goal prompt does not. The MDZ-procedure arm satisfied the non-default constraint on 18/20 runs (0.90); the goal-only arm satisfied it on 0/20. The goal arm converged on model defaults every time — asked to "encode so it is not immediately readable" both models reached for base64, not the requested ROT13; asked to "rewrite more clearly" they returned a lightly paraphrased sentence rather than the reversed word order. The two procedure-arm misses were pig-latin and rot13 on one model each — mechanical string transforms the model executed imperfectly, not defaults it fell back to. So the procedure is a steering mechanism, not decoration: it moves output into regions the goal prompt never reaches.

## Q4 — Parameters bind faithfully (0.9–1.0) through 3 module boundaries but drop to 0.8 at depth 4, setting a practical ceiling of ~3

Module trees with call depth {1,2,3,4}, three parameters per boundary, n=5, two cheap models. New metric: **parameter fidelity** — the fraction of `call` steps whose argument values match the reference exactly. We read parameter fidelity alongside exact-match and step accuracy. Exact-match and step accuracy tell us if the model produced the right overall trace. Parameter fidelity tells us something narrower: did the model call the right thing with the right arguments.

Parameter fidelity holds at 0.9–1.0 through call depth 3, then slips to 0.8 at depth 4. Step accuracy stays ≥0.97 across all depths. A wrong binding is a localised argument error, not a collapse of the whole trace.

Error compounds with depth, but gently. Depth 4 is the first cell where exact-match drops below the shallow level of 0.7.

Practical ceiling for reliable composition on cheap models: about 3 boundaries deep.

## Q5 — An in-context state ledger gives no accuracy gain, is worse at size 200 (0.834 vs 0.997), costs ~1.7× tokens and ~2.2× dollars, and caused every timeout

Large programs (100 and 200 statements). One arm executes the program internally, without writing down state. The other arm writes out the full state after every step and keeps it in context. Both use n=5 and two cheap models. Timeouts and errors count as failures: exact match is scored 0, step accuracy is scored 0. We compare accuracy against cost, measuring completion tokens for both providers and dollar cost for Claude only.

**Conclusion (Q5).** An in-context state ledger did not extend executable size, and it cost more. At size 100 the two arms were indistinguishable on accuracy (0.996 internal vs 0.989 ledger).

At size 200 the ledger arm was worse (0.997 vs 0.834). The extra bookkeeping inflated output length past the time budget: every timeout in the experiment was a size-200 ledger run, including one haiku run that failed even at a 10-minute limit.

The ledger arm was spending roughly 1.7x the completion tokens and 2.2x the Claude dollars for that negative return.

Writing state back into the context as prose was not helping a cheap model execute longer programs. This does not rule out true KV-cache injection, which is a different mechanism and is out of scope here.

## Limitations

- **Small n.** Default cells hold n=5 samples; anchor cells hold n=3. SEM bars appear on each chart. With this few samples, the bars are indicative only. Single-run noise can shift a cell's position.
- Two models, haiku and gpt-5.4-mini, ran every cell. Sonnet, opus and gpt-5.5 ran only at the Q2 size-25/100 anchors, three runs each. Claims about those three models outside the anchors have no support.
- Q5 tests an in-context ledger, not KV-cache injection. `../DESIGN.md` scopes true external state to writes into the KV cache. That requires local weights. This was out of scope here. The Q5 result bounds only the prose-ledger strategy. It says nothing about genuine KV-cache state.
- Opus dropped `assign` steps from its JSON trace on 2 of 3 size-100 runs, while its execution was correct. The step-accuracy metric penalises this as an execution error. Recomputing with emit-only steps shows the underlying execution score is 1.0. This is a trace-format problem, not an execution problem — the two need separate reporting.
- **Timeout handling.** Timed-out and errored runs are scored as failures: exact match zero, step accuracy zero. This is conservative. A run that would have finished correctly past the time limit is counted as wrong. All such failures fell in the Q5 size-200 ledger arm.
