#!/usr/bin/env python3
"""Assemble mdz-analysis-phase-1.html from prose + notebook charts (base64-inlined)."""
import base64
import pathlib

HERE = pathlib.Path(__file__).parent


def img(n: int, alt: str) -> str:
    data = base64.b64encode((HERE / "assets" / f"chart{n}.png").read_bytes()).decode()
    return (
        f'<figure><img src="data:image/png;base64,{data}" alt="{alt}">'
        f"<figcaption>Figure {n}. {alt}</figcaption></figure>"
    )


SAMPLE_PROGRAM = """$v0 = 6
$v1 = $v0 * 5
$v2 = "ok"
IF $v0 != 4 THEN
  IF $v1 != 4 THEN
    Say $v2
  END
END
FOR $v3 IN [1, 4, 0, 3, 7, 2, 1, 0, 4, 5]
  Say $v3
END"""

SAMPLE_TRACE = """[
  { "step": 1, "action": "assign", "var": "v0", "value": 6 },
  { "step": 2, "action": "assign", "var": "v1", "value": 30 },
  { "step": 3, "action": "assign", "var": "v2", "value": "ok" },
  { "step": 4, "action": "emit",   "value": "ok" },
  { "step": 5, "action": "emit",   "value": "1" },
  { "step": 6, "action": "emit",   "value": "4" },
  ...
]"""

HTML = f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MDZ Analysis — Phase 1: procedure execution fidelity</title>
<style>
  :root {{
    --ink: #1c2733; --muted: #5a6b7b; --accent: #0b7261; --accent-2: #b3541e;
    --card: #f6f8f9; --border: #e2e8ec; --code-bg: #10161d; --code-ink: #d8e2ea;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; color: var(--ink); background: #fff;
    font: 17px/1.65 Georgia, "Times New Roman", serif;
  }}
  main {{ max-width: 720px; margin: 0 auto; padding: 3rem 1.25rem 5rem; }}
  h1, h2, h3, .meta, figcaption, .stat, .note, .cols-label {{
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  }}
  h1 {{ font-size: 1.9rem; line-height: 1.25; margin: 0.4rem 0 0.4rem; }}
  h2 {{ font-size: 1.3rem; margin: 2.8rem 0 0.6rem; }}
  .meta {{ color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }}
  p {{ margin: 0.9rem 0; }}
  figure {{ margin: 1.6rem 0; }}
  figure img {{ width: 100%; border: 1px solid var(--border); border-radius: 8px; }}
  figcaption {{ font-size: 0.85rem; color: var(--muted); margin-top: 0.45rem; }}
  .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 0.75rem; margin: 1.8rem 0; }}
  .stat {{ background: var(--card); border: 1px solid var(--border); border-radius: 10px;
           padding: 0.9rem 1rem; }}
  .stat b {{ display: block; font-size: 1.5rem; color: var(--accent); }}
  .stat span {{ font-size: 0.82rem; color: var(--muted); }}
  .note {{ border-left: 4px solid var(--accent); background: var(--card);
           padding: 0.8rem 1.1rem; border-radius: 0 8px 8px 0; margin: 1.4rem 0;
           font-size: 0.95rem; }}
  .note b {{ color: var(--accent); }}
  .steps {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 0.75rem; margin: 1.4rem 0; counter-reset: step; }}
  .step {{ background: var(--card); border: 1px solid var(--border); border-radius: 10px;
           padding: 0.9rem 1rem; font-size: 0.92rem; }}
  .step::before {{ counter-increment: step; content: counter(step);
                   display: inline-block; width: 1.5rem; height: 1.5rem; line-height: 1.5rem;
                   text-align: center; border-radius: 50%; background: var(--accent);
                   color: #fff; font-weight: 700; font-size: 0.8rem; margin-bottom: 0.4rem; }}
  .step b {{ display: block; }}
  .cols {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1.4rem 0; }}
  @media (max-width: 640px) {{ .cols {{ grid-template-columns: 1fr; }} }}
  .cols-label {{ font-size: 0.8rem; font-weight: 600; color: var(--muted);
                 text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; }}
  pre {{ background: var(--code-bg); color: var(--code-ink); padding: 1rem;
         border-radius: 10px; overflow-x: auto; font: 0.82rem/1.55 "SF Mono", Menlo,
         Consolas, monospace; margin: 0; }}
  .vs {{ background: var(--card); border: 1px solid var(--border); border-radius: 10px;
         padding: 0.9rem 1rem; font-size: 0.95rem; }}
  .vs .good {{ color: var(--accent); font-weight: 600; }}
  .vs .bad {{ color: var(--accent-2); font-weight: 600; }}
  ul {{ padding-left: 1.2rem; }}
  li {{ margin: 0.4rem 0; }}
  a {{ color: var(--accent); }}
</style>
</head>
<body>
<main>

<h1>MDZ Analysis — Phase 1: procedure execution fidelity</h1>
<p class="meta">July 2026 · Daniel Grant ·
<a href="https://github.com/djgrant/mdz/tree/main/benchmark">djgrant/mdz/benchmark</a></p>

<h2>Summary</h2>

<p>MDZ is a superset of Markdown that adds programmatic control flow – loops,
conditionals, variables, and calls to other documents – to prose prompts, with an LLM as
the interpreter. A procedure is a different contract from a goal: the deliverable is
following the steps exactly. This report measures how faithfully five models honour that
contract, across the five questions set in the
<a href="https://github.com/djgrant/mdz/blob/main/RESEARCH.md">research brief</a>.</p>

<div class="stats">
  <div class="stat"><b>318</b><span>scored model runs</span></div>
  <div class="stat"><b>150</b><span>generated programs</span></div>
  <div class="stat"><b>5</b><span>models tested</span></div>
  <div class="stat"><b>$7.94</b><span>Claude API spend</span></div>
</div>

<p>The findings, in brief. Notation choice is safe to vary except that block delimiters
must remain visible in some form (§1). Execution degrades with statement count, and only
past ~100 observable steps; nesting depth and loop length cost nothing (§2). A procedure
measurably steers output where a goal-only prompt converges on model defaults, 18/20
against 0/20 on constraint satisfaction (§3). Parameters bind faithfully across module
boundaries to a call depth of three (§4). An in-context state ledger reduces accuracy and
raises cost, returning a negative result on state externalisation as tested (§5).</p>

<h2>Method</h2>

<p>MDZ is parseable, so a deterministic MDZ program has exactly one correct execution.
This makes procedure-following measurable against ground truth. The benchmark has three
parts:</p>

<div class="steps">
  <div class="step"><b>Generate</b> Random MDZ programs from a seed. Statement count,
  nesting, loop length, notation, and module structure are all parameters.</div>
  <div class="step"><b>Interpret</b> A reference interpreter computes each program's
  correct trace: every assignment, emitted value, and cross-module call.</div>
  <div class="step"><b>Score</b> A model executes the program and reports its own trace,
  which is scored against the reference. Every run is recorded with tokens and cost.</div>
</div>

<p>A small generated program is shown below, next to the start of its reference
trace:</p>

<div class="cols">
  <div><div class="cols-label">program (MDZ)</div><pre>{SAMPLE_PROGRAM}</pre></div>
  <div><div class="cols-label">reference trace</div><pre>{SAMPLE_TRACE}</pre></div>
</div>

<p>The headline metric is <strong>step accuracy</strong>: the fraction of the reference
trace the model reproduced in order, computed as the longest common subsequence of the
two traces. A step accuracy of 0.95 on a 100-step program means the model got 95 steps
right, in order. Most cells ran on the cheap models – Claude Haiku and
GPT&#8209;5.4&nbsp;mini, n=5 per cell – with Claude Sonnet, Claude Opus, and GPT&#8209;5.5
spot-checked at anchor cells (n=3). Cheap models are the case of interest: a procedure
that only runs on a frontier model is doing little work.</p>

<h2>1. Notation is robust; delimiters are the exception</h2>

<p>Surface syntax was varied while holding program logic constant. Lowercase keywords,
added type annotations, and indentation in place of explicit <code>END</code> keywords
all left trace accuracy unchanged. One variant broke. Removing block delimiters entirely
dropped step accuracy from 0.997 to 0.42, because the model can no longer see where a
loop body finishes, so it guesses.</p>

{img(1, "Step accuracy by notation feature. Only removing delimiters breaks execution.")}

<p>Deliberately malformed programs produced the most instructive result. Across ten runs
with an injected syntax error, no model halted: seven repaired the error silently, three
improvised.</p>

<div class="note"><b>Implication.</b> MDZ syntax can be varied freely provided block
boundaries stay visible. Strictness on malformed input must come from a parser in the
harness – an LLM interpreter has no concept of a parse failure.</div>

<h2>2. Length breaks execution; structure does not</h2>

<p>Programs were scaled along three dimensions independently: statement count (10–200),
nesting depth (1–5), and loop iterations (5–100). Only statement count degraded
execution. Step accuracy held at or above 0.99 through 100 statements, then slipped to
0.92 at 200. Deep nesting and long loops cost nothing.</p>

{img(2, "Step accuracy against statement count, nesting depth, and loop iterations. Only length erodes the trace.")}

<div class="note"><b>Implication.</b> A procedure of up to ~100 observable steps can
live in the prompt, on a cheap model. Beyond that, the logic should move into the
harness.</div>

<h2>3. A procedure changes the output; a goal does not</h2>

<p>This experiment asked whether a procedure changes what the model produces, or merely
relabels what it would have done anyway. Ten tasks were written in which faithfully
following the procedure forces output the model would not produce on its own. One task
asks for a summary written only in one-syllable words. Another asks for a ROT13
encoding. Another asks for an answer that avoids the letter <em>e</em>.</p>

<p>Every task ran in two arms. In the procedure arm, the model received the full MDZ
procedure. In the goal arm, it received a one-line request for the same outcome and was
left to its own devices.</p>

{img(3, "Constraint satisfaction by task. The procedure arm scored 18/20; the goal-only arm 0/20.")}

<p>The procedure arm satisfied its constraint on 18 of 20 runs. The goal arm satisfied
it on none of 20. The ROT13 task shows the pattern. Both arms were asked to encode
<em>attack at dawn</em>:</p>

<div class="cols">
  <div class="vs"><div class="cols-label">with procedure</div>
    <span class="good">nggnpx ng qnja</span> – followed the ROT13 steps letter by letter.</div>
  <div class="vs"><div class="cols-label">goal only</div>
    <span class="bad">YXR0YWNrIGF0IGRhd24=</span> – reached for base64, the encoding it
    defaults to.</div>
</div>

<div class="note"><b>Implication.</b> A procedure is a steering mechanism, measurably.
Without one, the model converges on the centre of its training distribution regardless
of the goal.</div>

<h2>4. Parameters survive three module boundaries</h2>

<p>MDZ documents call other documents with parameters – the composition mechanism behind
skills and sub-agents. Call chains were generated up to four deep, with three parameters
per boundary. Parameter fidelity – the fraction of calls in which every argument matched
the reference – stayed at 0.9–1.0 through depth three, then slipped to 0.8 at depth four
on Haiku. Errors were local substitutions rather than cascading corruption.</p>

{img(4, "Parameter fidelity by call depth. Binding is reliable to three boundaries on cheap models.")}

<h2>5. An in-context state ledger reduces accuracy and raises cost</h2>

<p>The final experiment tested whether externalising program state lets a small model
execute a larger program. The variant testable in this harness has the model rewrite a
full state ledger after every step, keeping its variable bindings explicit in context.
The ledger made things worse. At 200 statements it scored 0.83 against 1.00 for plain
execution, spent roughly 1.7× the output tokens, and produced every timeout in the
benchmark.</p>

{img(5, "Internal execution against the state-ledger variant. The ledger costs more and scores lower.")}

<p>The in-context ledger is a proxy, not the full hypothesis. Writing state directly
into the KV cache of a locally hosted model requires local weights and remains open.</p>

<h2>Limitations</h2>

<ul>
  <li>Five runs per cell (three at anchor cells) bounds the precision of every rate
  reported; differences smaller than ~0.2 should be read as direction only.</li>
  <li>Most cells ran on two cheap models. Frontier behaviour is spot-checked, not
  mapped.</li>
  <li>Opus at 100 statements executed correctly but omitted assignment steps from its
  reported trace on two of three runs. Full-trace accuracy penalises this to ~0.57;
  recomputed on emitted values only, its accuracy is 1.0. Both scores are shown in the
  notebook.</li>
  <li>Timeouts (all in the 200-statement ledger arm) are counted as failures.</li>
  <li>Generated programs are deterministic and self-contained. The results say nothing
  yet about semantic expressions, prose conditions, or real-world procedures.</li>
</ul>

<h2>Conclusions</h2>

<p>Two conclusions transfer beyond MDZ. First, a parseable notation gives ground truth,
and ground truth turns "the model seems to follow instructions" into a measured error
rate with a known breaking point. Second, strictness belongs in the harness. Models
repair rather than reject, and they lose fidelity with length rather than complexity –
so validation sits with a parser, and long procedures sit in orchestration code, with
the model executing the sub-100-step sections it is demonstrably good at.</p>

<p>The benchmark, programs, results, and analysis notebook are in the
<a href="https://github.com/djgrant/mdz/tree/main/benchmark">MDZ repository</a> under
<code>benchmark/</code>. Reproduction requires the two CLIs
(<code>claude</code>, <code>codex</code>) and one command per experiment; see
<code>benchmark/DESIGN.md</code>.</p>

</main>
</body>
</html>
"""

(HERE / "mdz-analysis-phase-1.html").write_text(HTML)
print("wrote", HERE / "mdz-analysis-phase-1.html", len(HTML), "bytes")
