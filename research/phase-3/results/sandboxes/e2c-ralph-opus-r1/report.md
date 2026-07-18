# MDZ Benchmark Results

Answers the five research questions in `../../RESEARCH.md` from the JSONL records in `../results/`, using the experiment design in `../DESIGN.md`.

All analysis here is offline. It re-scores stored model traces against reference traces and applies deterministic checkers. No model is called.

## Methods

### Duplicate records are resolved by last write wins

Failed runs were retried and re-appended to the JSONL files, so a record `id` can appear more than once. We load each file and keep the **last** record per `id`. The record schema is defined in `../DESIGN.md`.

### Four scores, defined here and used throughout

| Score | Definition | Direction |
|---|---|---|
| `scores.exact` | 1 if the model trace equals the reference after normalisation, else 0 | higher is better |
| `scores.stepAccuracy` | length of the longest common subsequence between the model's scored steps and the reference, divided by reference length | higher is better |
| `scores.firstDivergence` | index of the first mismatching step | higher is better |
| `scores.paramFidelity` | fraction of `call` steps whose argument values match the reference exactly; Q4 only | higher is better |

*The four scores recorded for every run, and which direction counts as better.*

Normalisation trims strings and compares numbers numerically, so a number and its string form are equal.

Q3 is not trace-scored. It uses a checker per task that tests the output directly, described in the Q3 section.

### Error bars are indicative, because a single noisy run can move a cell

Where a cell has n≥3 runs we show the standard error of the mean, that is the sample standard deviation divided by √n. n is 5 for default cells and 3 for anchors.

### Dollar cost is only available for the Claude models

Records per experiment are counted after dedup. The Codex/`gpt-*` runs report token counts and leave `costUsd` null, so every dollar figure below covers Claude models alone.

## Q1 – removing block delimiters is the only notation change that breaks execution

Fixed size of 40 statements, one notation feature varied at a time against the canonical baseline, n=5 per (notation × model), both cheap models.

We read each notation with two scores.

Mean step accuracy measures how much of the trace survived, so a partly correct run still earns credit.

Exact-match rate measures the fraction of runs whose trace was perfect. A run that gets one step wrong scores zero here and near one on step accuracy.

### Stripping `END` and indentation is the only variant that moves either score

| Notation | Mean step accuracy | Exact-match rate |
|---|---|---|
| canonical | 0.997 | 0.7 |
| `delimiter-none` (no `END`, no indentation) | 0.419 | – |
| `annotations-mismatch` | 0.98 | 0.5 |
| casing, indentation-as-delimiter | 0.98–1.00 | – |

*Trace quality per notation variant, n=5 per notation × model; higher is better on both columns. A dash marks a rate not reported for that row.*

Without `END` or indentation the model cannot recover block structure, which is why step accuracy falls from 0.997 to 0.419.

Indentation used *as* the delimiter is as safe as an explicit `END`, and changing keyword casing does not move either score.

### Mismatched type annotations are absorbed silently

Type annotations that contradict the values they label barely move step accuracy, at 0.98.

The exact-match rate tells a different story: 0.5 under `annotations-mismatch` against 0.7 canonical. The model coerces the mismatch and carries on without flagging it.

### No model halted on a malformed program

Across 10 malformed programs, models repaired 7 and improvised the remaining 3. None stopped.

**Conclusion (Q1).** Keep a block delimiter, either an explicit `END` or indentation. Expect the model not to reject malformed or mistyped input: in 10 out of 10 attempts it did not.

## Q2 – statement count drives breakdown, and only past about 100 statements

Three one-dimensional sweeps from a common base: statement count {10, 25, 50, 100, 200}, nesting depth {1, 3, 5}, loop iterations {5, 25, 100}. Default cells use the two cheap models at n=5. The size-25 and size-100 anchors additionally ran sonnet, opus and gpt-5.5 at n=3.

### Only statement count lowers step accuracy, and only at 200 statements

| Sweep | Range | Mean step accuracy |
|---|---|---|
| statement count | 10 → 100 | ≥0.99 |
| statement count | 200 | 0.919 |
| nesting depth | 1 → 5 | ≥0.99 |
| loop iterations | 5 → 100 | ≥0.99 |

*Mean step accuracy across each sweep; higher is better. Only statement count falls, and only at 200.*

### Opus dropped `assign` steps at size 100, and executed correctly anyway

On 2 of 3 size-100 runs, opus emitted only `emit` steps and dropped every `assign` step from its JSON trace. The scored steps that remain are perfectly correct.

So we show two numbers. Full step accuracy is the standard metric. Emit-only step accuracy restricts the longest common subsequence to `emit` steps, comparing the model's emits against the reference filtered to emits.

Filtered to emits, opus's size-100 execution scores 1.0. Standard step accuracy is therefore penalising a reporting-format error as though it were an execution error.

**Conclusion (Q2).** Cap programs by statement count rather than by nesting depth or loop iterations, which held ≥0.99 throughout. Score execution separately from trace format, since the opus anchor executed correctly while reporting incorrectly.

## Q3 – a spelled-out procedure steers output where a goal prompt does not

10 hand-written tasks live in `../src/generator/q3-tasks.ts`. Each task asks for an output the model would not produce by default, and runs twice on the same input:

- the **procedure prompt** spells out the steps as MDZ
- the **goal prompt** states only the desired outcome

We score whether the output meets the requirement, 0 or 1, with a deterministic per-task checker.

For the procedure prompt we take the `emit` value or values from the parsed trace, falling back to raw output. For the goal prompt we take the raw output.

Two checkers use heuristics rather than exact tests, and are flagged wherever their results appear. The `one-syllable-summary` checker estimates syllables by counting vowel groups, with no pronunciation dictionary. The `exactly-five-words` and `questions-only` checkers rely on regex sentence splitting.

### The goal prompt met the requirement zero times

| Prompt | Runs meeting the requirement | Rate |
|---|---|---|
| MDZ procedure | 18/20 | 0.90 |
| Goal only | 0/20 | 0.00 |

*Share of runs whose output met the task requirement; higher is better.*

Two examples of the goal prompt falling back to a model default:

- Asked to "encode so it is not immediately readable", both models reached for base64. The procedure prompt produced the requested ROT13.
- Asked to "rewrite more clearly", the goal prompt returned a lightly paraphrased sentence. The requested transformation was reversed word order.

The two procedure-prompt misses were pig-latin and rot13, on one model each. Both are mechanical string transforms the model executed imperfectly, so neither is a fallback to a default.

**Conclusion (Q3).** Spell the procedure out when the output must differ from the model's default. Across 20 runs, the goal-only prompt never produced the requested output and the procedure prompt produced it 18 times.

## Q4 – parameter binding is near-perfect to depth 3 and slips at depth 4

Module trees with call depth {1, 2, 3, 4}, 3 parameters per boundary, n=5, two cheap models.

Parameter fidelity asks whether each call carried the right argument values. Step accuracy asks whether the trace as a whole matched.

Reading them together separates a wrong argument from a wrong trace.

### Fidelity drops at depth 4 while the surrounding trace holds

| Call depth | Parameter fidelity | Step accuracy |
|---|---|---|
| 1–3 | 0.9–1.0 | ≥0.97 |
| 4 | 0.8 | ≥0.97 |

*Argument correctness and trace correctness by call depth, n=5 per depth × model; higher is better on both.*

Step accuracy holds at ≥0.97 across all depths while fidelity drops. A wrong binding is therefore a localised argument error rather than a collapse of the surrounding trace.

Depth 4 is the first cell where exact-match falls below the shallow level, to 0.7.

**Conclusion (Q4).** The practical ceiling for reliable composition on cheap models is about 3 boundaries deep.

## Q5 – an in-context state ledger does not extend executable size, and costs more

Large programs of 100 and 200 statements, n=5, two cheap models.

- the **internal run** tracks program state in the model's own reasoning
- the **ledger run** writes a state block into its output after every step, so the state sits in context as text

Timeouts and errors count as failures, scored as exact=0 and step accuracy=0.

We compare accuracy against cost, using completion tokens for both providers and dollar cost for Claude only.

### The ledger is level at size 100 and worse at size 200

| Program size | Internal | Ledger |
|---|---|---|
| 100 | 0.996 | 0.989 |
| 200 | 0.997 | 0.834 |

*Mean step accuracy by program size, n=5 per size × model; higher is better.*

The extra bookkeeping inflated output length past the time budget. Every timeout in the experiment was a size-200 ledger run, including one haiku run that failed even at a 10-minute limit.

The ledger runs spent roughly 1.7× the completion tokens and 2.2× the Claude dollars for that return.

**Conclusion (Q5).** Writing state back into the context as prose does not help a cheap model execute longer programs.

This result covers ledgers written in context only. Injecting state directly into the model's key-value cache is a different mechanism, needs local weights, and is out of scope for this run.

## Limitations

- **Small n.** Default cells are n=5 and anchor cells n=3. The SEM bars are indicative only at this sample size, and single-run noise can move a cell.
- **Two cheap models carry most cells.** Every cell ran haiku and gpt-5.4-mini. Sonnet, opus and gpt-5.5 appear only at the Q2 size-25 and size-100 anchors, at n=3. Cross-model claims outside those anchors are unsupported.
- **Q5 tests a ledger held in context.** Per `../DESIGN.md`, writing state into the model's key-value cache requires local weights and was out of scope. The Q5 result bounds the written-ledger strategy alone.
- **Opus dropped steps from its trace.** On 2 of 3 size-100 runs, opus dropped `assign` steps from its JSON trace while executing correctly. Standard step accuracy penalises this as an execution error. The emit-only recomputation shows the underlying execution was correct, at 1.0.
- **Timeout handling.** Timed-out and errored runs are scored as failures, exact=0 and step accuracy=0. A run that would have finished correctly past the time limit is counted as wrong, which is conservative. All such failures fell in the Q5 size-200 ledger arm.
- **Q3 heuristic checkers.** Syllable counting uses a vowel-group estimate with no pronunciation dictionary, and the five-words and questions-only checkers rely on regex sentence splitting. These can misjudge edge-case outputs, and the affected checkers are flagged inline.

## Summary of findings

| Question | Finding |
|---|---|
| Q1 | Dropping block delimiters collapses step accuracy from 0.997 to 0.419. Casing, indentation-as-delimiter and type annotations stay within 0.98–1.00. Mismatched annotations are absorbed silently, and malformed programs are never halted on. |
| Q2 | Statement count is the only dimension that breaks execution in range: ≥0.99 through 100 statements, 0.919 at 200. Nesting depth and loop iterations stay ≥0.99. |
| Q3 | The MDZ-procedure prompt met the task requirement 90% of the time; the goal-only prompt 0%. |
| Q4 | Parameter fidelity is 0.9–1.0 at call depth 1–3 and 0.8 at depth 4, while step accuracy stays ≥0.97 throughout. |
| Q5 | The ledger gained no accuracy at size 100 and lost accuracy at size 200 (0.834 against 0.997), while spending ~1.7× the completion tokens and ~2.2× the dollar cost. |

*One row per research question; every figure is repeated from the section above.*
