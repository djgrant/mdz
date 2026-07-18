# MDZ Benchmark Results

This report answers the five research questions in `../../RESEARCH.md` from the JSONL records in `../results/`, following the experiment design in `../DESIGN.md`.

All analysis is offline. It re-scores stored model traces against reference traces and applies deterministic checkers. No model is called.

Every metric is defined the first time it appears.

## How runs were loaded and scored

**Data loading and dedup.** Failed runs were retried and re-appended to the JSONL files, so a record `id` can appear more than once. We load each file and keep the **last** record per `id` — last write wins. The record schema is defined in `../DESIGN.md`.

**Scores.** Each record carries four fields:

| Field | Meaning |
| --- | --- |
| `scores.exact` | 1 if the model trace equals the reference after normalisation, else 0 |
| `scores.stepAccuracy` | longest-common-subsequence length ÷ reference length |
| `scores.firstDivergence` | index of the first mismatching step |
| `scores.paramFidelity` | Q4 only; defined in the Q4 section |

Normalisation trims strings and compares numbers numerically, so a number and its string form are equal.

Q3 is not trace-scored. It uses the per-task output-constraint checkers described in its own section.

**Uncertainty.** Where a cell has n≥3 runs we show the standard error of the mean (SEM = sample sd ÷ √n) as error bars. n is small — 5 for default cells, 3 for anchors — so the bars are indicative rather than decisive.

**Run counts and cost.** Records per experiment are counted after dedup. Dollar cost is recorded for Claude models only; the Codex/`gpt-*` runs report token counts but `costUsd` is null.

## Q1 — Only the removal of block delimiters raises the error rate

Size was fixed at 40 statements and one notation feature was varied at a time against the canonical baseline, n=5 per (notation × model), on both cheap models.

We read *error rate* through two lenses:

- **step accuracy** — graceful: how much of the trace survived
- **exact-match rate** — strict: the fraction of runs with a perfect trace

*Mean step accuracy by notation variant. Higher is better; 1.0 is a perfect trace.*

| Notation variant | Mean step accuracy |
| --- | --- |
| canonical | 0.997 |
| casing | 0.98–1.00 |
| indentation-as-delimiter | 0.98–1.00 |
| annotations-mismatch | 0.98 |
| `delimiter-none` | **0.419** |

Dropping block delimiters entirely — no `END`, no indentation — is the one variant that breaks execution. Without either marker the model cannot recover block structure. Indentation *as* the delimiter is as safe as an explicit `END`, and keyword casing makes no difference.

Type annotations barely move step accuracy, but they move the strict metric. Under `annotations-mismatch` the exact-match rate is 0.5 against 0.7 for canonical: a mismatched annotation is absorbed silently rather than flagged. The model coerces where you might expect it to error.

No model ever halted on a malformed program. Of 10 malformed runs, 7 were repaired and 3 were improvised.

**For a prompt author.** Keep a delimiter, either form. Do not rely on the model to reject malformed or mistyped input.

## Q2 — Statement count breaks execution; nesting and iteration do not

Three one-dimensional sweeps ran from a common base: statement count {10,25,50,100,200}, nesting depth {1,3,5}, loop iterations {5,25,100}. Default cells use the two cheap models (n=5). The size-25 and size-100 anchors additionally ran sonnet, opus and gpt-5.5 (n=3).

*Mean step accuracy on the cheap default models, by swept dimension. Higher is better.*

| Dimension | Range swept | Step accuracy |
| --- | --- | --- |
| statement count | 10 → 100 | ≥0.99 |
| statement count | 200 | **0.919** |
| nesting depth | 1 → 5 | ≥0.99 |
| loop iterations | 5 → 100 | ≥0.99 |

Length erodes the trace; structure does not. The ceiling worth designing around sits at roughly 100 statements, and raising nesting depth or iteration count at fixed size costs nothing measurable.

### The weak opus anchor is a trace-format failure, not an execution failure

At the size-100 anchor opus scores poorly on the standard metric. On 2 of 3 runs it emitted only `emit` steps and dropped every `assign` step from its JSON trace. The scored steps that remain — the emits — are perfectly correct.

So we show two numbers:

- **full step accuracy** — the standard metric over all steps
- **emit-only step accuracy** — LCS restricted to `emit` steps, comparing the model's emits against the reference filtered to emits

Filtered to emits, opus's size-100 execution scores 1.0. It executed the program correctly and mis-formatted the output.

**Two implications.** Put the size ceiling, not the nesting ceiling, in the design rule. Score execution and trace-format compliance separately.

## Q3 — A spelled-out procedure diverges from the goal baseline; a goal prompt converges on defaults

10 hand-written tasks (`../src/generator/q3-tasks.ts`) each carry a non-default **constraint** and two arms sharing the same input:

- **arm A** spells out the procedure as MDZ
- **arm B** gives only the high-level goal

A deterministic per-task checker scores whether the output *satisfies the constraint* (0/1). The procedure-arm answer is the `emit` value(s) from the parsed trace, falling back to raw output; the goal-arm answer is the raw output.

Two checkers use documented heuristics and are flagged inline: **one-syllable-summary** estimates syllables by counting vowel groups with no dictionary, and **exactly-five-words** / **questions-only** rely on regex sentence splitting.

*Runs satisfying the non-default constraint, out of 20 (10 tasks × 2 models). Higher is better.*

| Arm | Satisfied | Rate |
| --- | --- | --- |
| A — procedure spelled out as MDZ | 18/20 | **0.90** |
| B — goal only | 0/20 | **0.00** |

The goal arm reached for a model default every time:

| Task | Constraint | Goal-arm output |
| --- | --- | --- |
| "encode so it is not immediately readable" | ROT13 | base64, on both models |
| "rewrite more clearly" | reversed word order | a lightly paraphrased sentence |

The two procedure-arm misses were pig-latin and rot13, on one model each. Both are mechanical string transforms the model executed imperfectly — not defaults it fell back to.

The procedure moves output into regions the goal prompt never reaches.

## Q4 — Parameters bind faithfully to depth 3 and degrade at depth 4

Module trees ran at call depth {1,2,3,4} with 3 parameters per boundary, n=5, on the two cheap models.

New metric: **parameter fidelity** = the fraction of `call` steps whose argument values match the reference exactly. Reading it alongside exact-match and step accuracy separates "called the right thing with the right args" from "produced the right overall trace".

*Binding quality by call depth. Higher is better on all three columns.*

| Call depth | Parameter fidelity | Step accuracy | Exact-match |
| --- | --- | --- | --- |
| 1–3 | 0.9–1.0 | ≥0.97 | above depth-4 level |
| 4 | **0.8** | ≥0.97 | **0.7** |

Step accuracy holds at ≥0.97 across every depth. So when a binding goes wrong it is a localised argument error, not a collapse of the whole trace. Depth 4 is the first cell where exact-match drops below the shallow level.

**Practical ceiling** for reliable composition on cheap models: about 3 boundaries deep.

## Q5 — An in-context state ledger does not extend executable size, and costs more

Large programs of 100 and 200 statements ran in two arms, n=5, on the two cheap models:

- **arm A** executes internally
- **arm B** maintains an explicit state-ledger block after every step — external state, held in context

Timeouts and errors count as failures (exact=0, step accuracy=0). We compare accuracy *and* cost: completion tokens for both providers, dollar cost for Claude only.

This is an *in-context* ledger. True KV-cache state injection needs local weights and is out of scope for this run — see Limitations.

*Mean step accuracy by program size and arm. Higher is better.*

| Program size | Arm A (internal) | Arm B (ledger) |
| --- | --- | --- |
| 100 statements | 0.996 | 0.989 |
| 200 statements | 0.997 | **0.834** |

At size 100 the arms are indistinguishable. At size 200 the ledger arm is worse, because the extra bookkeeping inflated output length past the time budget. Every timeout in the experiment was a size-200 ledger run, including one haiku run that failed even at a 10-minute limit.

The ledger arm spent roughly 1.7× the completion tokens and 2.2× the Claude dollars for that negative return.

**Verdict for this design.** Writing state back into the context as prose does not help a cheap model execute longer programs. This says nothing about true KV-cache injection, which is a different mechanism.

## Summary of findings

| Question | Finding |
| --- | --- |
| Q1 | Only removing block delimiters changes the error rate: step accuracy 0.997 → 0.419. Casing, indentation-as-delimiter and annotations stay within 0.98–1.00. |
| Q2 | Statement count drives breakdown, past ~100 statements (0.919 at 200). Nesting depth and loop iterations stay ≥0.99. |
| Q3 | The procedure arm satisfied the non-default constraint 90% of the time; the goal-only arm 0%. |
| Q4 | Parameter fidelity is 0.9–1.0 through depth 3 and 0.8 at depth 4; step accuracy stays ≥0.97. |
| Q5 | The ledger gave no accuracy gain and was worse at size 200 (0.834 vs 0.997), at ~1.7× tokens and ~2.2× cost. |

## Limitations

- **Small n.** Default cells are n=5 and anchor cells n=3. SEM bars are shown, but with this few samples they are indicative only; single-run noise can move a cell.
- **Two cheap models carry most cells.** Every cell ran haiku and gpt-5.4-mini. Sonnet, opus and gpt-5.5 appear only at the Q2 size-25/100 anchors (n=3). Cross-model claims outside those anchors are not supported.
- **Q5 tests an in-context ledger, not KV-cache injection.** Per `../DESIGN.md`, true external state written into the KV cache requires local weights and was out of scope. The Q5 result bounds only the prose-ledger strategy.
- **Opus trace-format caveat.** On 2/3 size-100 runs opus dropped `assign` steps from its JSON trace while executing correctly. The standard step-accuracy metric penalises this as an execution error; the emit-only recomputation shows the execution was correct (1.0).
- **Timeout handling.** Timed-out and errored runs are scored as failures (exact=0, step accuracy=0). A run that would have finished correctly past the time limit is counted as wrong. All such failures fell in the Q5 size-200 ledger arm.
- **Q3 heuristic checkers.** Syllable counting uses a vowel-group estimate with no pronunciation dictionary, and the five-words / questions-only checkers rely on regex sentence splitting. These can misjudge edge-case outputs; the affected checkers are flagged inline.
</content>
</invoke>
