# MDZ Benchmark Results

This report answers the five research questions in `../../RESEARCH.md`. It uses the JSONL records in `../results/` and the experiment design in `../DESIGN.md`. All analysis here is offline: it re-scores stored model traces against reference traces and applies deterministic checkers. No model is called during scoring.

Every metric is defined the first time it appears below.

## Methods

**Data loading and dedup.** Failed runs were retried and re-appended to the JSONL files. A record `id` can therefore appear more than once. We load each file and keep the **last** record per `id` — last write wins. The record schema is defined in `../DESIGN.md`.

**Scores.** Each record carries four possible scores. `scores.exact` is 1 if the model's trace equals the reference trace after normalisation, else 0. `scores.stepAccuracy` is the length of the longest common subsequence between the model's steps and the reference steps, divided by the reference length — so 1.0 means every reference step was reproduced in order, and 0 means none was. `scores.firstDivergence` is the index of the first mismatching step. For Q4 there is a fifth score, `scores.paramFidelity`, described in that section. Normalisation trims strings and treats a number and its string form as equal.

Q3 is scored differently: it has no reference trace to compare against, so it uses per-task pass/fail checkers described in that section.

**Uncertainty.** Where a cell has three or more runs, we show the standard error of the mean (sample standard deviation divided by the square root of the run count) as error bars. Run counts are small — 5 for default cells, 3 for anchor cells — so treat the bars as indicative rather than conclusive.

### Run counts and cost

Records per experiment after dedup, and total spend. Dollar cost is recorded for Claude models only; the Codex/`gpt-*` runs report token counts but `costUsd` is null.

## Q1 — Only removing block delimiters breaks execution; other notation changes are noise

The experiment held program size fixed at 40 statements and varied one notation feature at a time against a canonical baseline. Five runs ran per (notation feature × model) pair, across both cheap models.

We read the resulting error rate through two scores. Mean **step accuracy** is graceful: it credits a run for however much of the trace survived. **Exact-match rate** is strict: it only credits a run that reproduced the trace perfectly.

Removing block delimiters entirely — no `END` keyword, no indentation — is the condition labelled `delimiter-none`. It collapsed mean step accuracy from 0.997 (canonical baseline) to 0.419. Without either `END` or indentation, the model has no way to tell where a block ends, so it loses the block structure.

Every other feature we tested left step accuracy within noise (0.98–1.00) of the baseline. Using indentation as the sole delimiter, instead of the `END` keyword, is as safe as canonical. Keyword casing made no measurable difference.

Type annotations barely moved step accuracy either (0.98 under `annotations-mismatch`). But the exact-match rate under that condition fell to 0.5, against 0.7 for canonical. So a mismatched type annotation does not stop the model executing the surrounding steps — it is silently absorbed rather than flagged as an error.

We also tested what happens when the input program is malformed. No model ever halted or reported the malformation. Models repaired the program and carried on in 7 of 10 cases, and improvised a replacement in the remaining 3.

For a prompt author, the practical implication is narrow: keep some delimiter, either form, and do not expect the model to reject malformed or mistyped input on its own.

## Q2 — Statement count alone triggers breakdown, past 100 statements

The experiment ran three one-dimensional sweeps from a common baseline program: statement count across {10, 25, 50, 100, 200}, nesting depth across {1, 3, 5}, and loop iterations across {5, 25, 100}. Default cells used the two cheap models at 5 runs each. The size-25 and size-100 cells additionally ran three more expensive models — sonnet, opus, gpt-5.5 — at 3 runs each, as anchors.

On the two cheap models, step accuracy held at 0.99 or above through 100 statements, then fell to 0.919 at 200 statements. Neither of the other two dimensions produced a comparable drop: nesting depth from 1 to 5, and loop iterations from 5 to 100, both left step accuracy at 0.99 or above throughout.

So statement count is the dimension that drives breakdown, and it only does so past roughly 100 statements. Neither deeper nesting nor more loop iterations, at fixed size, degraded the trace.

### The opus anchor is a formatting failure, not an execution failure

At the size-100 anchor cell, opus scored poorly on step accuracy. Inspecting the traces showed why: on 2 of the 3 size-100 runs, opus emitted only `emit` steps in its JSON output and silently dropped every `assign` step. The `emit` steps that remained were all correct.

To separate the two failure modes, we recomputed step accuracy restricted to `emit` steps only — comparing the model's emitted values against a reference trace that was itself filtered down to `emit` steps. On that emit-only metric, opus's size-100 execution scores 1.0.

The model executed the program correctly. It only failed to write every step type into its trace. This is a trace-format compliance issue, separate from whether the underlying execution was right.

Two consequences follow. First, a size ceiling belongs in the design rule, not a nesting-depth ceiling — nesting and iteration count are not the risk. Second, execution correctness and trace-format compliance should be scored and reported as two separate numbers, since a model can fail one while succeeding at the other.

## Q3 — A written-out procedure changes the output; a goal-only prompt does not

Ten hand-written tasks are defined in `../src/generator/q3-tasks.ts`. Each task has a **constraint** that is not the default way a model would satisfy the task's stated goal. Each task ran in two arms with the same input. Arm A spells the procedure out step by step, in MDZ. Arm B states only the high-level goal and leaves the procedure to the model.

Two checkers rely on documented heuristics rather than exact matching, and their results should be read with that caveat: **one-syllable-summary** estimates syllable count by counting vowel groups, with no pronunciation dictionary; **exactly-five-words** and **questions-only** rely on regex-based sentence splitting.

Each run is scored 0 or 1, for whether its output satisfies the task's constraint. Across 10 tasks and 2 models, that gives 20 runs per arm.

The MDZ-procedure arm satisfied its constraint on 18 of those 20 runs (0.90). The goal-only arm satisfied its constraint on 0 of 20.

Two examples show what the goal-only arm converged on instead of the constraint. Asked to "encode so it is not immediately readable", both models produced base64 — not the ROT13 the task's constraint called for. Asked to "rewrite more clearly", both models returned a lightly paraphrased sentence, not the reversed word order the constraint specified. In every case, the goal-only arm reached for whichever transform the model would produce by default.

The 2 procedure-arm misses were not defaults either: they were pig-latin and rot13, one miss per model, where the model attempted the specified mechanical string transform and got it wrong. That is a different failure mode from converging on a default.

Spelling out the procedure moved the model's output into results the goal prompt never reached in this test.

## Q4 — Parameter binding holds through depth 3, then degrades

The experiment built module trees with call depth {1, 2, 3, 4}, three parameters passed at each module boundary, 5 runs per cell, on the two cheap models.

This section introduces one new score: **parameter fidelity**, the fraction of `call` steps whose argument values match the reference exactly. Reading it alongside step accuracy separates two questions — did the model call the right thing with the right arguments, versus did it produce the right overall trace.

Parameter fidelity held between 0.9 and 1.0 through call depth 3. At depth 4 it slipped to 0.8. Step accuracy, over the same range, stayed at 0.97 or above at every depth.

That combination means a wrong parameter binding is a localised argument error. It does not collapse the surrounding trace.

Error does compound with depth, but slowly. Depth 4 is the first cell where the exact-match rate drops below its depth-1–3 level of 0.7. For a design that composes modules on the cheap models tested here, depth 3 is the last point at which binding is still reliable.

## Q5 — An in-context ledger doesn't help, and costs more

The experiment used large programs of 100 and 200 statements. Arm A executes the program internally, without writing state back into the context. Arm B maintains an explicit state-ledger block after every step — state held in context rather than inside the model. Each cell ran 5 times, on the two cheap models.

This is a test of an *in-context* ledger only. True state injection into the model's KV cache would need local weights, which was out of scope for this run — see Limitations.

Timeouts and errors count as failures in this section: a timed-out or errored run scores 0 on both exact-match and step accuracy.

At size 100, the two arms are close: 0.996 step accuracy for internal execution against 0.989 for the ledger. At size 200 they separate: 0.997 for internal execution against 0.834 for the ledger — the ledger arm is worse, not merely no better.

Every timeout recorded in the whole experiment came from a size-200 ledger run. One haiku run in that cell failed even at a 10-minute time limit. The extra bookkeeping the ledger arm writes into its output appears to have pushed some runs past the time budget.

The ledger arm also cost more even where it did finish: roughly 1.7 times the completion tokens of the internal-execution arm, and roughly 2.2 times the dollar cost on the Claude models.

Writing state back into the context as prose did not let a cheap model execute a longer program correctly, in this test. It only added tokens, dollars, and — at the larger size — timeouts.

## Limitations

- **Run counts are small.** Default cells ran 5 times; anchor cells ran 3 times. The standard-error bars shown reflect that — with this few runs, a single unusual run can move a cell noticeably, so treat the bars as indicative.
- **Two cheap models carry most cells.** Every cell ran haiku and gpt-5.4-mini. Sonnet, opus and gpt-5.5 appear only at the Q2 size-25 and size-100 anchor cells, at 3 runs each. Claims about model differences outside those two anchors are not supported by this data.
- **Q5 tests an in-context ledger, not KV-cache injection.** Per `../DESIGN.md`, writing state directly into the KV cache would require local model weights, and that was out of scope here. The Q5 result bounds only the prose-ledger strategy tested; it says nothing about genuine KV-cache state.
- **The opus trace-format issue.** On 2 of 3 size-100 runs, opus dropped `assign` steps from its JSON trace while still executing the program correctly. The standard step-accuracy score penalises this as though it were an execution error. The emit-only recomputation in Q2 shows the underlying execution was correct (1.0). Trace-format compliance and execution correctness are different things and are reported separately for that reason.
- **Timeout handling is conservative.** A timed-out or errored run is scored as a failure (exact = 0, step accuracy = 0), even though it might have finished correctly given more time. All such failures in this run fell in the Q5 size-200 ledger arm.
- **The Q3 heuristic checkers can misjudge edge cases.** Syllable counting uses a vowel-group estimate with no pronunciation dictionary. The five-words and questions-only checkers rely on regex sentence splitting. Both can be wrong on unusual outputs; the affected checkers are flagged inline in the Q3 section.
