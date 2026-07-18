# MDZ Benchmark Results

Answers the five research questions in `../../RESEARCH.md` from the JSONL records in `../results/`, using the experiment design in `../DESIGN.md`. All analysis here is offline: it re-scores stored model traces against reference traces and applies deterministic checkers. No model is called.

## Methods

**Data loading and dedup.** Failed runs were retried and re-appended to the JSONL files, so a record `id` can appear more than once. We load each file and keep the **last** record per `id` (last write wins). Record schema is defined in `../DESIGN.md`.

**Scores.** Each record carries four fields:

| Field | Meaning |
| --- | --- |
| `scores.exact` | 1 if the model trace equals the reference after normalisation, else 0 |
| `scores.stepAccuracy` | longest-common-subsequence length between model and reference steps / reference length |
| `scores.firstDivergence` | index of the first mismatching step |
| `scores.paramFidelity` | Q4 only; defined in that section |

Normalisation trims strings and compares numbers numerically, so `7` and `"7"` are equal.

Q3 is not trace-scored. It uses the per-task output-constraint checkers defined in that section.

**Uncertainty.** Where a cell has n≥3 runs we show the standard error of the mean (SEM = sample sd / √n) as error bars. n is small — 5 for default cells, 3 for anchors — so treat error bars as indicative.

### Run counts and cost

Records per experiment after dedup, and total spend. Dollar cost is recorded for Claude models only; the Codex/`gpt-*` runs report token counts but `costUsd` is null.

## Q1 — Removing block delimiters collapses accuracy to 0.419; keyword casing, indentation-as-delimiter and type annotations do not affect accuracy

Fixed size (40 statements), one notation feature varied at a time against the canonical baseline; n=5 per (notation × model), both cheap models.

We measure error rate two ways. Mean **step accuracy** measures how much of the trace was correct, so a run that got most steps right still scores well. **Exact-match rate** is the fraction of runs whose trace was correct in every step, so a run that got one step wrong scores zero.

**Conclusion (Q1).** Removing block delimiters altogether (`delimiter-none`: no `END`, no indentation) is the only feature that breaks execution: step accuracy falls from 0.997 to 0.419. Without `END` or indentation the model cannot recover block structure.

Indentation *as* the delimiter is as safe as explicit `END`, and keyword casing is irrelevant.

Type annotations barely move trace accuracy, but note the exact-match rate when the annotations contradict the values they label (`annotations-mismatch`): 0.5, against 0.7 for the canonical notation. When an annotation says one type and the value is another, the model converts the value to fit and carries on. It does not report the contradiction.

No model ever stopped when given a malformed program. The models either repaired the program and ran it (7 of 10 runs) or made up a plausible reading and ran that (3 of 10 runs).

If you are writing one of these prompts: keep a block delimiter, either an explicit `END` or indentation, and do not rely on the model to reject input that is malformed or wrongly typed.

## Q2 — Execution holds to 100 statements and falls to 0.919 at 200; nesting and loop count cost nothing

Three one-dimensional sweeps from a common base: statement count {10,25,50,100,200}, nesting depth {1,3,5}, loop iterations {5,25,100}. Default cells use the two cheap models (n=5); the size-25 and size-100 anchors additionally ran sonnet, opus, gpt-5.5 (n=3).

### Opus's low anchor score is a dropped-`assign` formatting lapse, not an execution failure

At the size-100 anchor, opus scores look poor on the standard metric. On 2 of 3 runs it emitted only `emit` steps and dropped every `assign` step from its JSON trace. The scored steps that remain are perfectly correct, so the model executed the program right and only mis-formatted the output.

We show both: the standard **full step accuracy**, and an **emit-only step accuracy** (LCS restricted to `emit` steps, comparing the model's emits against the reference filtered to emits).

**Conclusion (Q2).** Execution is driven by **statement count**, and only past ~100 statements. On the cheap default models, step accuracy holds ≥0.99 through 100 statements and drops to 0.919 at 200.

Increasing nesting depth (1→5) or loop iterations (5→100) while holding statement count fixed leaves accuracy ≥0.99. Nesting and looping do not degrade the trace; only the number of statements does.

The opus anchor confirms the caveat about the metric: when the comparison is restricted to `emit` steps, opus's size-100 execution scores 1.0.

There are two implications. First, a design rule should set a ceiling on statement count rather than on nesting depth. Second, execution correctness and trace-format compliance should be scored separately.

## Q3 — The procedure arm satisfied the constraint on 18/20 runs; the goal arm on 0/20

10 hand-written tasks (`../src/generator/q3-tasks.ts`). Each has a non-default **constraint** and two arms sharing the same input: **arm A** spells out the procedure as MDZ; **arm B** gives only the high-level goal.

We score whether the output *satisfies the constraint* (0/1) with a deterministic per-task checker. The procedure-arm answer is the `emit` value(s) from the parsed trace, falling back to raw output; the goal-arm answer is the raw output.

Two checkers use documented heuristics and are flagged: **one-syllable-summary** estimates syllables by counting vowel groups (no dictionary), and **exactly-five-words** / **questions-only** rely on regex sentence splitting.

**Conclusion (Q3).** The MDZ-procedure arm satisfied the non-default constraint on 18/20 runs (0.90); the goal-only arm satisfied it on 0/20.

The goal arm converged on model defaults every time:

| Goal prompt | Constraint | Goal arm produced | Procedure arm produced |
| --- | --- | --- | --- |
| "encode so it is not immediately readable" | ROT13 | base64, both models | correct ROT13 |
| "rewrite more clearly" | reversed word order | lightly paraphrased sentence | reversed word order |

The two failures in the procedure arm were pig-latin and ROT13, on one model each. In both cases the model was attempting the character-by-character transformation the procedure asked for and made mistakes doing it. It was not falling back on a default behaviour.

Writing the procedure out therefore changes what the model produces. It is not presentational. Spelling out the steps produces outputs that the goal-only prompt never produced in any of its 20 runs.

## Q4 — Parameter fidelity stays 0.9–1.0 to depth 3 and slips to 0.8 at depth 4

Module trees with call depth {1,2,3,4}, 3 parameters per boundary, n=5, two cheap models.

New metric: **parameter fidelity** = fraction of `call` steps whose argument values match the reference exactly. We read it alongside exact-match and step accuracy to separate "called the right thing with the right args" from "produced the right overall trace".

**Conclusion (Q4).** Parameter fidelity is 0.9–1.0 through call depth 3 and slips to 0.8 at depth 4. Step accuracy stays ≥0.97 across all depths, so when a binding is wrong it is a localised argument error, not a collapse of the whole trace.

Errors do accumulate as depth increases, but slowly: depth 4 is the first cell where the exact-match rate falls below the rate at shallower depths (0.7). On these cheap models, roughly three call boundaries is the practical limit for composing modules reliably.

## Q5 — Writing the running state out after every step is worse at size 200 (0.834 vs 0.997) and costs ~1.7× the tokens

Large programs (100 and 200 statements). **Arm A** executes the program and tracks the values of variables without writing them down. **Arm B** writes out, after every step, a block listing the current value of every variable, so the state is on the page rather than held implicitly — though still inside the same context window. n=5, two cheap models. **Timeouts and errors count as failures** (exact=0, step accuracy=0).

We compare accuracy *and* cost: completion tokens for both providers, dollar cost for Claude only.

Scope note: arm B keeps the written-out state inside the context window. Loading state directly into the model's key-value cache is a different technique, requires local model weights, and was out of scope for this run (see Limitations).

**Conclusion (Q5).** At size 100 the two arms score the same within measurement error: 0.996 for arm A against 0.989 for arm B. At size 200 arm B, which writes the state out, is *worse* — 0.834 against 0.997.

Writing out the state after every step made the output much longer, and the longer output ran past the time budget. Every timeout in the experiment was a size-200 arm B run, including one haiku run that still did not finish at a 10-minute limit.

Arm B spent about 1.7× the completion tokens and about 2.2× the Claude dollars, and scored worse for it.

For this design, then: having a cheap model write its running state back into the context as prose does not let it execute longer programs. This says nothing about loading state into the key-value cache, which works by a different mechanism and was not tested here.

## Executive summary

- **Q1 — Only dropping block delimiters breaks execution; no other notation feature changes the result.** Removing them collapsed mean step accuracy from 0.997 to 0.419. Keyword casing, using indentation as the delimiter, and type annotations all stayed between 0.98 and 1.00, which is within run-to-run variation. No model ever stopped when given a malformed program.

- **Q2 — Statement count breaks execution past about 100 statements; nesting depth and loop iteration count do not.** Step accuracy holds ≥0.99 through 100 statements and falls to 0.919 at 200 statements, while nesting depth (1→5) and loop iterations (5→100) stay ≥0.99 throughout.

- **Q3 — A prompt that spells out the procedure satisfies the non-default constraint 90% of the time; a prompt that states only the goal satisfies it 0% of the time.** Across 10 tasks × 2 models, the goal-only prompts produced the model's default behaviour every time.

- **Q4 — Parameter values pass correctly through about three call boundaries, then degrade gradually.** Parameter fidelity is 0.9–1.0 at call depth 1–3 and slips to 0.8 at depth 4; step accuracy stays ≥0.97 throughout.

- **Q5 — Having the model write its running state out after every step does not let it execute longer programs, and costs about 2.2× more.** At size 200 that arm scored 0.834 against 0.997 for executing without writing state out, and it produced every timeout in the experiment.

## Limitations

- **Small n.** Default cells are n=5 and anchor cells n=3. SEM bars are shown but with this few samples they are indicative only; single-run noise can move a cell.
- **Two cheap models carry most cells.** Every cell ran haiku and gpt-5.4-mini; sonnet, opus and gpt-5.5 appear only at the Q2 size-25/100 anchors (n=3). Cross-model claims outside those anchors are not supported.
- **Q5 tests writing state out inside the context window, not loading state into the key-value cache.** Per `../DESIGN.md`, writing state directly into the model's key-value cache requires local model weights and was out of scope. The Q5 result applies only to the strategy of writing state out as prose; it says nothing about the key-value cache approach.
- **Opus trace-format caveat.** On 2/3 size-100 runs opus dropped `assign` steps from its JSON trace while executing correctly. The standard step-accuracy metric penalises this as if it were an execution error; the emit-only recomputation shows the underlying execution was correct (1.0). Whether a model formats its trace correctly and whether it executes the program correctly are two different things, and should be reported separately.
- **Timeout handling.** Timed-out and errored runs are scored as failures (exact=0, step accuracy=0). This is conservative: a run that would have finished correctly past the time limit is counted as wrong. All such failures fell in the Q5 size-200 arm that wrote its state out after every step.
- **Q3 heuristic checkers.** Syllable counting uses a vowel-group estimate (no pronunciation dictionary) and the five-words / questions-only checkers rely on regex sentence splitting. These can misjudge edge-case outputs; the affected checkers are flagged inline.
