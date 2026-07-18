# Research orientation

RESEARCH.md holds the questions; RESEARCH-NOTES.md holds each phase's working
notes and corrected findings; each phase folder holds its own DESIGN.md,
generators, harness, results, and analysis.

## Analysis discipline

Phase 3's E2b report shipped "ralph won 9–3" when the mechanism data showed the
losing program was never executed (sonnet: 0/6 complete pipelines), and the
real findings — non-compliance, and behaviour drift from by-value code relay —
surfaced only under cross-examination afterwards. These rules exist so that
does not recur. Apply them before writing any finding; re-read them before
building any report.

1. **Gate every arm comparison on mechanism compliance.** Before comparing
   outcomes, verify from the trace that each arm executed its intended
   mechanism (spawn counts, tool calls, iteration structure). A run that did
   not execute the program is a compliance finding, and its outcome must be
   excluded or separately reported — never averaged into the arm.

2. **No ranking without a causal account of the loss.** "X beat Y" is a
   scoreboard, not a finding. The finding is why Y lost, grounded in run-level
   evidence. If the loss mode is not established, say the comparison is
   unexplained rather than implying the winner's shape caused it.

3. **Read the qualitative evidence before writing the headline.** Judge
   reasons, transcripts of the extreme runs, and diffs of shipped artefacts.
   The E2b judge reasons said "byte-identical copy" and "silently drops
   locale support" in plain text; nobody read them until after the report.

4. **Classify findings as compliance, mechanism, or outcome — and never let
   one masquerade as another.** An outcome number downstream of a compliance
   failure is not an outcome finding.

5. **Run an adversarial pass before building the report.** Actively try to
   kill each headline claim: what run-level evidence would falsify it, and
   does that evidence exist in the results? A claim nobody tried to kill is
   a draft, not a finding.

6. **Reconcile contradictions with prior phases explicitly.** If a result
   inverts an earlier claim (as E2b inverted phase-2's delegation fidelity),
   name the earlier claim, state the new scope, and update RESEARCH-NOTES.md
   in the same change.

7. **Trace every headline number to the runs that produced it.** If a stat in
   a report cannot be regenerated from the results files by a named script,
   it does not go in the report.

## Standing conventions

- Traces are harness-captured, never self-reported (phase-1 lesson).
- Arms must be content-matched; a variant missing the content is a strawman
  (phase-2 E4 lesson).
- Sandboxes are archived to `results/sandboxes/<id>` so scorers can re-run
  tests and benchmarks; never score from model-reported outcomes.
- Runs are resumable by id: errored records are superseded by re-runs, last
  record per id wins.
- "Ran out of time" must not masquerade as "cannot do it" — set per-entry
  timeouts with headroom at breakdown sizes.
