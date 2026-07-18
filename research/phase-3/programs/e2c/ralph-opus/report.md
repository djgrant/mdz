# MDZ Benchmark Results

Answers the five research questions in `../../RESEARCH.md` from the JSONL records in `../results/`, using the experiment design in `../DESIGN.md`. All analysis here is offline: it re-scores stored model traces against reference traces and applies deterministic checkers. No model is called.

Every metric is defined the first time it appears.

## Executive summary

- **Q1 — Which notation features change the error rate?** Only one feature moved the needle. Dropping block delimiters entirely (`delimiter-none`: no `END`, no indentation) collapsed mean step accuracy from **0.997** (canonical) to **0.419**; casing, indentation-as-delimiter, and type annotations all stayed within noise (0.98–1.00). Type-annotation mismatches were absorbed silently rather than flagged (exact-match rate 0.5 vs 0.7 canonical, step accuracy 0.98). Malformed programs were never halted on: models repaired 7/10 and improvised 3/10. *Step accuracy* = length of the longest common subsequence between the model's scored steps and the reference / reference length.

- **Q2 — At what size does execution break down, and which dimension drives it?** Statement count is the only dimension that breaks execution in range. On the two cheap default models, step accuracy holds ≥0.99 through 100 statements and falls to **0.919** at 200; nesting depth (1→5) and loop iterations (5→100) stay ≥0.99 throughout. So breakdown is driven by *statement count*, not structural complexity, and only past ~100 statements.

- **Q3 — Does a faithfully executed procedure diverge from the goal baseline, or converge on model defaults?** It diverges sharply. Across 10 tasks × 2 models, the MDZ-procedure arm satisfied the non-default constraint **90%** of the time; the goal-only arm satisfied it **0%** of the time. Goal prompts converged on defaults every time (e.g. asked to "encode so it is not immediately readable", both models chose base64; the procedure arm produced correct ROT13). Procedures steer output, they do not merely relabel it.

- **Q4 — Do parameters bind faithfully across module boundaries, and does error compound with depth?** Binding is near-perfect at shallow depth and degrades gradually. *Parameter fidelity* (fraction of `call` steps whose argument values match the reference exactly) is 0.9–1.0 at call depth 1–3 and slips to **0.8** at depth 4; step accuracy stays ≥0.97 throughout. Error compounds with depth but slowly — depth 4 is the first cell where a majority of runs are no longer exact.

- **Q5 — Does an in-context state ledger extend executable size, and at what token cost?** No, and it costs more. Having the model maintain an explicit state-ledger block gave no accuracy gain over plain internal execution (size 100: 0.989 vs 0.996 step accuracy; size 200: **0.834** vs 0.997 — the ledger arm was worse) while spending ~1.7× the completion tokens and ~2.2× the dollar cost, and it produced every timeout in the experiment (1 haiku size-200 ledger run failed even at a 10-minute limit). This tests an in-context ledger only; true KV-cache state injection needs local weights and is out of scope (see Limitations).

## Methods

**Data loading and dedup.** Failed runs were retried and re-appended to the JSONL files, so a record `id` can appear more than once. We load each file and keep the **last** record per `id` (last write wins). Record schema is defined in `../DESIGN.md`.

**Scores.** Each record carries `scores.exact` (1 if the model trace equals the reference after normalisation, else 0), `scores.stepAccuracy` (longest-common-subsequence length / reference length), `scores.firstDivergence` (index of first mismatching step), and for Q4 `scores.paramFidelity`. Q3 is not trace-scored; it uses per-task output-constraint checkers defined in that section. Normalisation trims strings and compares numbers numerically (a number and its string form are equal).

**Uncertainty.** Where a cell has n≥3 runs we show the standard error of the mean (SEM = sample sd / √n) as error bars. n is small (5 for default cells, 3 for anchors), so treat error bars as indicative.

### Run counts and cost

Records per experiment after dedup, and total spend (dollar cost is recorded for Claude models only; the Codex/`gpt-*` runs report token counts but `costUsd` is null).

## Q1 — Which notation features change the error rate?

Fixed size (40 statements), one notation feature varied at a time against the canonical baseline; n=5 per (notation × model), both cheap models. We read *error rate* through two lenses: mean **step accuracy** (graceful — how much of the trace survived) and **exact-match rate** (strict — fraction of runs with a perfect trace).

**Conclusion (Q1).** Notation robustness is high except for one cliff. Removing block delimiters altogether (`delimiter-none`) is the only feature that breaks execution — step accuracy falls from 0.997 to 0.419 — because without `END` or indentation the model cannot recover block structure. Indentation *as* the delimiter is as safe as explicit `END`. Keyword casing is irrelevant. Type annotations barely matter to trace accuracy, but note the exact-match rate under `annotations-mismatch` (0.5 vs 0.7 canonical): mismatched annotations are absorbed silently, not flagged — a coercion, not an error. And no model ever halted on a malformed program: they repaired (7/10) or improvised (3/10). For a prompt author: keep a delimiter (either form), and do not rely on the model to reject malformed or mistyped input.

## Q2 — At what program size does execution break down, and which dimension drives it?

Three one-dimensional sweeps from a common base: statement count {10,25,50,100,200}, nesting depth {1,3,5}, loop iterations {5,25,100}. Default cells use the two cheap models (n=5); the size-25 and size-100 anchors additionally ran sonnet, opus, gpt-5.5 (n=3).

### Q2 anchor models and the opus trace-format caveat

At the size-100 anchor, opus scores look poor on the standard metric — but the failure is a *trace-format* failure, not an execution failure. On 2 of 3 size-100 runs opus emitted only `emit` steps and dropped every `assign` step from its JSON trace. The scored steps that remain (the emits) are perfectly correct, so the model executed the program right and only mis-formatted the output.

We show both: the standard **full step accuracy**, and an **emit-only step accuracy** (LCS restricted to `emit` steps, comparing the model's emits against the reference filtered to emits).

**Conclusion (Q2).** Execution is driven by **statement count**, and only past ~100 statements. On the cheap default models, step accuracy holds ≥0.99 through 100 statements and drops to 0.919 at 200; increasing nesting depth (1→5) or loop iterations (5→100) at fixed size leaves accuracy ≥0.99. Structural complexity is cheap; sheer length is what erodes the trace. The opus anchor confirms the metric caveat: filtered to emits, opus's size-100 execution is 1.0 — its low full score is a dropped-`assign` formatting lapse, not a wrong answer. Two implications: put the size ceiling, not the nesting ceiling, in the design rule; and score execution and trace-format compliance separately.

## Q3 — Does a faithfully executed procedure diverge from the goal baseline?

10 hand-written tasks (`../src/generator/q3-tasks.ts`). Each has a non-default **constraint** and two arms sharing the same input: **arm A** spells out the procedure as MDZ; **arm B** gives only the high-level goal. We score whether the output *satisfies the constraint* (0/1) with a deterministic per-task checker. The procedure-arm answer is the `emit` value(s) from the parsed trace (falling back to raw output); the goal-arm answer is the raw output.

Two checkers use documented heuristics and are flagged: **one-syllable-summary** estimates syllables by counting vowel groups (no dictionary), and **exactly-five-words** / **questions-only** rely on regex sentence splitting.

**Conclusion (Q3).** A faithfully executed procedure changes the output; a goal prompt does not. The MDZ-procedure arm satisfied the non-default constraint on 18/20 runs (0.90); the goal-only arm satisfied it on 0/20. The goal arm converged on model defaults every time — asked to "encode so it is not immediately readable" both models reached for base64, not the requested ROT13; asked to "rewrite more clearly" they returned a lightly paraphrased sentence rather than the reversed word order. The two procedure-arm misses were pig-latin and rot13 on one model each — mechanical string transforms the model executed imperfectly, not defaults it fell back to. So the procedure is a steering mechanism, not decoration: it moves output into regions the goal prompt never reaches.

## Q4 — Do parameters bind faithfully across module boundaries, and does error compound with depth?

Module trees with call depth {1,2,3,4}, 3 parameters per boundary, n=5, two cheap models. New metric: **parameter fidelity** = fraction of `call` steps whose argument values match the reference exactly. We read it alongside exact-match and step accuracy to separate "called the right thing with the right args" from "produced the right overall trace".

**Conclusion (Q4).** Parameters bind faithfully at shallow depth and degrade slowly. Parameter fidelity is 0.9–1.0 through call depth 3 and slips to 0.8 at depth 4; step accuracy stays ≥0.97 across all depths, so when a binding is wrong it is a localised argument error, not a collapse of the whole trace. Error does compound with depth, but gently: depth 4 is the first cell where exact-match drops below the shallow level (0.7). Practical ceiling for reliable composition on cheap models: about 3 boundaries deep.

## Q5 — Does an in-context state ledger extend executable size, and at what token cost?

Large programs (100 and 200 statements). **Arm A** executes internally; **arm B** maintains an explicit state-ledger block after every step (external state, but held in context). n=5, two cheap models. **Timeouts and errors count as failures** (exact=0, step accuracy=0). We compare accuracy *and* cost (completion tokens for both providers; dollar cost for Claude only).

Scope note: this is an *in-context* ledger. True KV-cache state injection needs local weights and is out of scope for this run (see Limitations).

**Conclusion (Q5).** An in-context state ledger does not extend executable size, and it costs more. At size 100 the two arms are indistinguishable on accuracy (0.996 internal vs 0.989 ledger); at size 200 the ledger arm is *worse* (0.997 vs 0.834), because the extra bookkeeping inflated output length past the time budget — every timeout in the experiment was a size-200 ledger run, including one haiku run that failed even at a 10-minute limit. The ledger arm spent ~1.7× the completion tokens and ~2.2× the Claude dollars for that negative return. Verdict for this design: writing state back into the context as prose does not help a cheap model execute longer programs. This does not rule out true KV-cache injection, which is a different mechanism and out of scope here.

## Limitations

- **Small n.** Default cells are n=5 and anchor cells n=3. SEM bars are shown but with this few samples they are indicative only; single-run noise can move a cell.
- **Two cheap models carry most cells.** Every cell ran haiku and gpt-5.4-mini; sonnet, opus and gpt-5.5 appear only at the Q2 size-25/100 anchors (n=3). Cross-model claims outside those anchors are not supported.
- **Q5 tests an in-context ledger, not KV-cache injection.** Per `../DESIGN.md`, true external state written into the KV cache requires local weights and was out of scope. The Q5 result bounds only the prose-ledger strategy; it says nothing about genuine KV-cache state.
- **Opus trace-format caveat.** On 2/3 size-100 runs opus dropped `assign` steps from its JSON trace while executing correctly. The standard step-accuracy metric penalises this as if it were an execution error; the emit-only recomputation shows the underlying execution was correct (1.0). Trace-format compliance and execution correctness are distinct and should be reported separately.
- **Timeout handling.** Timed-out and errored runs are scored as failures (exact=0, step accuracy=0). This is conservative: a run that would have finished correctly past the time limit is counted as wrong. All such failures fell in the Q5 size-200 ledger arm.
- **Q3 heuristic checkers.** Syllable counting uses a vowel-group estimate (no pronunciation dictionary) and the five-words / questions-only checkers rely on regex sentence splitting. These can misjudge edge-case outputs; the affected checkers are flagged inline.
