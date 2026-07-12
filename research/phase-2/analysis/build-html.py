#!/usr/bin/env python3
"""Assemble mdz-analysis-phase-2.html from prose + charts (base64-inlined)."""
import base64
import pathlib

HERE = pathlib.Path(__file__).parent


def img(name: str, n: int, alt: str) -> str:
    data = base64.b64encode((HERE / "assets" / f"{name}.png").read_bytes()).decode()
    return (
        f'<figure><img src="data:image/png;base64,{data}" alt="{alt}">'
        f"<figcaption>Figure {n}. {alt}</figcaption></figure>"
    )


FAULTS = """$v0: String = 6            # type fault: declared String, given a number
FOR $v3 [1, 4, 0, 3, 7]    # syntax fault: IN is missing"""

CONSUMER = """# Simplify the heuristics

USE ~/skills/simplify WITH
  items: #heuristics

## Heuristics

- Prefer the reversible decision when two options look equally good.  CANARY-…-1
- Estimate the cost of delay before optimising the cost of work.      CANARY-…-2
- Write the announcement first, then build what it describes.         CANARY-…-3
- If a meeting has no decision to make, make it an email.             CANARY-…-4"""

MISDELEGATION = """TaskCreate  {  "subject": "Map: Summarize item 1",
              "description": "instruction: Summarise the item in one short
                              sentence and include the item's CANARY token
                              verbatim. item: The northern warehouse reports
                              a stock surplus… CANARY-E2-inline-3-1"  }

TaskOutput  {  "task_id": "1", "block": true, "timeout": 60000  }"""

STATELOG = """{ "tool": "set", "name": "v0", "value": "6"  }
{ "tool": "set", "name": "v1", "value": "30" }
{ "tool": "set", "name": "v2", "value": "ok" }
…27 calls logged. The reference trace has 57 assignments."""

PROCEDURE = """IF $days > 14 THEN
  $decision = "denied"
  Compose a polite reply explaining that
  refunds are only available within 14
  days of renewal. Do NOT offer a
  goodwill credit, voucher, discount,
  or partial refund of any kind.
ELSE
  $decision = "approved"
  …
END"""

GOAL = """You are a customer support
agent. Handle the refund
request in the input fairly
and helpfully."""

HTML = f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MDZ Analysis — Phase 2: accountable execution</title>
<style>
  :root {{
    --ink: #1c2733; --muted: #5a6b7b; --accent: #0b7261; --accent-2: #b3541e;
    --card: #f6f8f9; --border: #e2e8ec; --code-bg: #10161d; --code-ink: #d8e2ea;
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; color: var(--ink); background: #fff;
         font: 17px/1.65 Georgia, "Times New Roman", serif; }}
  main {{ max-width: 720px; margin: 0 auto; padding: 3rem 1.25rem 5rem; }}
  h1, h2, .meta, figcaption, .stat, .note, .steps, .step, .verdict, .cols-label {{
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }}
  h1 {{ font-size: 1.9rem; line-height: 1.25; margin: 0.4rem 0; }}
  h2 {{ font-size: 1.3rem; margin: 2.8rem 0 0.4rem; }}
  .meta {{ color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }}
  .meta a {{ color: var(--muted); }}
  p {{ margin: 0.9rem 0; }}
  ul {{ margin: 0.9rem 0; padding-left: 1.2rem; }}
  li {{ margin: 0.55rem 0; }}
  .verdict {{ font-size: 1.02rem; color: var(--accent); font-weight: 600;
              margin: 0.2rem 0 1.1rem; }}
  figure {{ margin: 1.6rem 0; }}
  figure img {{ width: 100%; border: 1px solid var(--border); border-radius: 8px; }}
  figcaption {{ font-size: 0.85rem; color: var(--muted); margin-top: 0.45rem; }}
  .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 0.75rem; margin: 1.8rem 0; }}
  .stat {{ background: var(--card); border: 1px solid var(--border); border-radius: 10px;
           padding: 0.9rem 1rem; }}
  .stat b {{ display: block; font-size: 1.5rem; color: var(--accent); }}
  .stat span {{ font-size: 0.82rem; color: var(--muted); }}
  .steps {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 0.75rem; margin: 1.4rem 0; }}
  .step {{ background: var(--card); border: 1px solid var(--border); border-radius: 10px;
           padding: 0.9rem 1rem; font-size: 0.92rem; }}
  .step b {{ display: block; margin-bottom: 0.3rem; color: var(--accent); }}
  .note {{ border-left: 4px solid var(--accent); background: var(--card);
           padding: 0.8rem 1.1rem; border-radius: 0 8px 8px 0; margin: 1.4rem 0;
           font-size: 0.95rem; }}
  .note b {{ color: var(--accent); }}
  .cols {{ display: grid; grid-template-columns: 1.4fr 1fr; gap: 0.75rem; margin: 1.4rem 0; }}
  .cols-label {{ font-size: 0.8rem; color: var(--muted); margin-bottom: 0.3rem;
                 text-transform: uppercase; letter-spacing: 0.04em; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1.2rem 0;
           font-size: 0.92rem; font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }}
  th, td {{ border: 1px solid var(--border); padding: 0.45rem 0.65rem; text-align: left; }}
  th {{ background: var(--card); }}
  code {{ background: var(--card); border: 1px solid var(--border); border-radius: 4px;
          padding: 0.05rem 0.3rem; font-size: 0.88em; }}
  pre {{ background: var(--code-bg); color: var(--code-ink); border-radius: 8px;
         padding: 1rem 1.2rem; overflow-x: auto; font-size: 0.82rem; line-height: 1.55;
         margin: 1.2rem 0; }}
  pre code {{ background: none; border: none; padding: 0; color: inherit; }}
</style>
</head>
<body>
<main>

<h1>MDZ Analysis — Phase 2: accountable execution</h1>
<p class="meta">July 2026 · Daniel Grant ·
<a href="https://github.com/djgrant/mdz/tree/main/research">djgrant/mdz/research</a></p>

<h2>Summary</h2>

<p>MDZ is a superset of Markdown that adds programmatic control flow – loops,
conditionals, variables, calls to other documents – to prose prompts, with an LLM as the
interpreter.</p>

<p>This report tests whether MDZ execution can be held to account. Can the notation
enforce its own rules? Do values survive delegation to other agents? Can program state be
tracked outside the model? Does a written procedure change what a model actually
does?</p>

<p>The evidence comes from outside the model. Programs run inside a real agent harness
(Claude Code): the session transcript records every tool call and every subagent spawned,
a state server logs every read and write, and canary tokens – unique strings threaded
through the program's data – prove where values travelled.</p>

<div class="stats">
  <div class="stat"><b>147</b><span>scored model runs</span></div>
  <div class="stat"><b>44</b><span>agentic runs with captured transcripts</span></div>
  <div class="stat"><b>40</b><span>LLM-judge verdicts</span></div>
  <div class="stat"><b>4</b><span>experiments</span></div>
</div>

<p>The findings, in brief:</p>

<ul>
<li><b>Notation can enforce types, not syntax.</b> <code>PRAGMA STRICT</code> halted
10/10 programs carrying a type violation; without it, 0/10. Broken syntax sailed through
in both modes, because the model repairs bad grammar in the act of reading it – the check
never sees a fault. (§1)</li>
<li><b>Delegation corrupts nothing, but cheap models pick the wrong tool.</b> All 24
fan-out runs delivered every parameter to a delegation payload intact. Haiku twice sent
the work to a todo list instead of an agent, then quietly did it itself. (§2)</li>
<li><b>External state is cheap but incomplete.</b> Models logged roughly a quarter of
their assignments to the state tool, at half the token cost of printing a trace. The
programs' outputs stayed correct throughout. (§3)</li>
<li><b>A procedure nearly triples compliance.</b> 0.90 against 0.35 on deterministic
policy checks. Goal prompts complied only where the policy matched what the model would
have done anyway. (§4)</li>
</ul>

<h2>Method</h2>

<p>Every deterministic MDZ program has exactly one correct execution, which a reference
interpreter computes. A model's run is scored against it: <strong>step accuracy</strong>
is the fraction of the reference trace the model reproduced, in order. Three channels
supply the evidence:</p>

<div class="steps">
  <div class="step"><b>Transcripts</b> The harness's session log records every tool call
  and subagent spawn, with the full prompt each worker received.</div>
  <div class="step"><b>State server</b> A <code>state</code> tool exposes
  <code>get</code>/<code>set</code>; its server appends every call to a log the model
  cannot edit.</div>
  <div class="step"><b>Canaries</b> Each work item carries a unique token, so "did item 3
  reach worker 3?" is an exact string match.</div>
</div>

<p>Cheap models are the case of interest – a procedure that only runs on a frontier
model is doing little work. Haiku and gpt-5.4-mini carry the single-turn experiments;
haiku and sonnet the agentic ones. All scoring is offline, and the phase's entire API
spend was under $7.</p>

<h2>1. Strict mode enforces types; syntax is repaired before any check can run</h2>

<p class="verdict">One line of notation made type annotations binding – 10/10 violations
halted. Syntax faults never reached the check.</p>

<p>Models do not stop when a program is broken. Handed damaged input, they repair it
silently and carry on – in a compliance setting, the worst possible default. This
experiment asks whether a single line of notation can change that. Each forty-statement
program received one deliberate fault:</p>

<pre><code>{FAULTS}</code></pre>

<p>Programs ran with and without <code>PRAGMA STRICT</code> as their first statement.
Strict mode's contract: validate before executing; on any violation, emit one halt step
and stop.</p>

{img('e1-halt', 1, 'How often the model stopped on a broken program (1.0 = always, the goal). The pragma is decisive for type faults and useless for syntax faults, on both models.')}

<p>The pragma is binding for exactly one fault class. A type fault leaves both halves of
the contradiction on the page – <code>String</code>, then <code>6</code> – and comparing
them is a local act a model can be instructed to perform. A missing <code>IN</code> never
survives that long: repairing malformed text is what a language model's decoding does, so
by the time any check could run, the model is already reading the corrected sentence.</p>

{img('e1-tax', 2, 'Step accuracy on clean programs (1.0 = perfect). Strict mode costs haiku nothing; the gpt-5.4-mini dip is one false halt in five runs, not degraded execution.')}

<p>Strictness is nearly free. Haiku executed clean programs identically in both modes and
never halted one by mistake. gpt-5.4-mini refused one clean program in five – that single
false alarm is its entire visible cost.</p>

<div class="note"><b>Design consequence.</b> Type contracts can live in the notation.
Grammar contracts cannot: malformed-input safety must come from a deterministic validator
gate before execution – which is exactly what the MDZ parser and LSP provide.</div>

<h2>2. Parameters survive delegation; the failure is picking the wrong tool</h2>

<p class="verdict">All 24 fan-out runs delivered every parameter intact. Both failures
chose the wrong delegation mechanism – visibly.</p>

<p>MDZ composes by letting skills call skills. The stress test is the higher-order case:
a <code>map-reduce</code> skill that takes <code>$items</code>, <code>$map</code> and
<code>$reduce</code>, and spawns one worker agent per item. Four consumer programs call
it; this one binds <code>$items</code> to a heading in its own document:</p>

<pre><code>{CONSUMER}</code></pre>

<p>The canary at the end of each item proves, by string match, which worker received it.
Twenty-four runs: four programs, two models, three repetitions each.</p>

{img('e2-fidelity', 3, "Four checks per run (1.0 = perfect). Sonnet is near-perfect throughout. Haiku's dips are two runs that delegated to the wrong tool – its parameters arrived intact even then.")}

<p>Binding never failed. Every canary in every run reached a delegation payload – across
the skill boundary, through the higher-order call, out to the workers. The heading anchor
cost nothing. Sonnet spawned real subagents twelve times out of twelve.</p>

<p>Haiku failed twice, and the failures are the finding. Both times it resolved "spawn a
worker" to the harness's todo-list tool instead of its agent tool:</p>

<pre><code>{MISDELEGATION}</code></pre>

<p>A todo item never executes. Haiku polled it for results, got nothing, and did the work
inline itself. Even here the payloads were perfect – three items, three faithfully-bound
<code>TaskCreate</code> calls. And no run in the experiment cheated quietly: every one
either spawned workers or visibly tried to, so the failure is checkable in the
transcript.</p>

<p>One result we did not design for. The fourth variant's <code>$map</code> told each
worker to cite an exact passphrase and echo its canary verbatim. Haiku's workers,
receiving the instruction byte-perfect, refused it in all three runs as suspected prompt
injection; sonnet's workers ran identical prompts without comment. Delegation transports
an instruction's <em>appearance</em> along with its content, and text that looks like an
attack pattern can die at a worker's safety layer with every byte intact.</p>

<div class="note"><b>Design consequence.</b> Parameter binding needs no defence. What
<code>SPAWN</code> needs is an unambiguous mapping to the harness's real delegation tool
– and test probes that look like ordinary data, because probes that look like attacks end
up measuring the safety layer instead of the skill.</div>

<h2>3. Models will not volunteer their state, even to a tool</h2>

<p class="verdict">Execution stayed correct everywhere. The state log captured a quarter
of it – at half the token cost of self-reporting.</p>

<p>Can program state live outside the model? Here the model gets a <code>state</code>
tool and one instruction: call <code>set</code> after every assignment. The control arm
is the model printing its own trace, as phase 1 scored it. Assignments are scored from
the server's log, which the model cannot edit; this is what haiku's log looks like against
a 200-statement program:</p>

<pre><code>{STATELOG}</code></pre>

{img('e3-store', 4, 'External state tool vs self-reported trace, haiku. Output stays correct in both arms; the external log captures about a quarter of assignments – at roughly half the completion tokens.')}

<table>
<tr><th></th><th>Output correctness</th><th>State-log completeness</th><th>Tokens (200 stmts)</th></tr>
<tr><td>Self-reported trace, haiku</td><td>1.00</td><td>1.00</td><td>19.4k</td></tr>
<tr><td>State tool, haiku</td><td>0.97–1.00</td><td>≈ 0.25</td><td>10.2k</td></tr>
<tr><td>State tool, sonnet</td><td>1.00</td><td>0.21–0.47</td><td>–</td></tr>
</table>

<p>The gap is behavioural, not mechanical – the transcript and the server log agree
call-for-call in every run, so the log holds exactly what the model chose to send. Both
tiers treat per-assignment logging as bookkeeping subordinate to the task, and shed it
under load. Sonnet showed the same instinct in the control arm, dropping assignments from
one printed trace while emitting perfect output.</p>

<p>The economics are the good news: a <code>set</code> call is terse where a printed
trace line is not, so the store arm halved completion tokens against self-report.</p>

<div class="note"><b>Design consequence.</b> No instruction made state-logging complete
at any tier tested. A reliable trace needs the logging to be structural – an
interpreter-as-tool that owns the program counter and forces each step through a tool
call. That is the candidate mechanism for phase 3.</div>

<h2>4. A procedure changes the answer; a goal prompt gets the default</h2>

<p class="verdict">0.90 vs 0.35 on deterministic policy checks – and the goal arm passed
only where the policy matched the model's instincts anyway.</p>

<p>Ten tasks were written so that the helpful answer breaks the stated policy. In the
example below, the customer is sixteen days past renewal with a sympathetic story; the
policy denies refunds after fourteen days and forbids the consolation gestures a support
agent instinctively reaches for. One arm gets the procedure, the other the goal, both get
the same input:</p>

<div class="cols">
  <div><div class="cols-label">arm A – MDZ procedure</div><pre><code>{PROCEDURE}</code></pre></div>
  <div><div class="cols-label">arm B – goal prompt</div><pre><code>{GOAL}</code></pre></div>
</div>

<p>A deterministic checker scores each decision. A sonnet judge, shown only the procedure
and the output, scores process adherence from 0 to 2.</p>

{img('e4-compliance', 5, 'The same ten tasks, two prompt styles (higher = better in both panels). The procedure arm passes the policy checker at 0.90; the goal arm at 0.35, and only where policy already matches model defaults.')}

<p>The procedure arm passed 18 of 20 runs; the goal arm 7 of 20. The distribution of the
seven is the telling part: all of them sit on tasks whose policy is conservative –
password reset, change freeze – where doing the cautious default happens to be doing the
policy. Wherever the policy demanded something unusual, the goal arm complied zero times.
The judge saw the same split from the process side, 1.95 against 0.60, noting repeatedly
that goal-arm outputs were good answers that simply were not the procedure's answer.</p>

<p>The two procedure-arm misses were a single task on both models, and both got the
decision right while using a forbidden word in the rationale. The failure surface shrank
from wrong outcome to wrong phrasing – something a linter can catch.</p>

<h2>5. Program size, read across the corpus</h2>

<p>No dedicated size experiment ran; every record carries size metadata instead, and the
question is read observationally. Making statements heavier – tool traffic on every step
– did not lower the ceiling in range: 200-statement programs still produced output at
0.97 accuracy or better. The data is too thin to move the known ~100-statement ceiling;
it is enough to say heavier statements did not collapse it.</p>

<h2>Limitations</h2>

<ul>
<li><b>Small n.</b> Cells are n=3–6; headline rates like 10/10 and 2/12 are directional,
not tight.</li>
<li><b>Model coverage.</b> Single-turn cells ran haiku and gpt-5.4-mini; agentic cells
ran haiku and sonnet, because transcript capture is built on the claude CLI.</li>
<li><b>The misdelegation finding is harness-specific.</b> Resolving "Task" to a todo-list
tool is a fact about Claude Code's tool namespace as much as about haiku. The general
claim – mechanism fails before binding does – should be re-tested on other harnesses.</li>
<li><b>The §2 refusals implicate the measurement design.</b> A passphrase demand plus
conspicuous canary tokens resembles an injection attempt. Future canaries should look
like ordinary data.</li>
<li><b>One state protocol tested.</b> Set-per-assignment is the strictest
instruction-only protocol; batched and checkpoint protocols were not tried. KV-cache
state still awaits local weights.</li>
<li><b>Checkers are strict by design.</b> §4 counts a correct decision with banned
phrasing as a failure.</li>
<li><b>Judge circularity.</b> A claude model judged claude and gpt outputs. The
deterministic checkers, not the judge, carry the headline result.</li>
</ul>

<h2>Verdicts on the research questions</h2>

<table>
<tr><th>Question</th><th>Phase-2 answer</th></tr>
<tr><td>Can notation enforce program integrity?</td><td>For types, yes: one pragma, ten
halts out of ten. For grammar, no: validation must precede execution, in the
harness.</td></tr>
<tr><td>Does composition hold under real delegation?</td><td>Binding holds without
qualification. Mechanism selection is the failure point on cheap models.</td></tr>
<tr><td>Does external state extend execution?</td><td>It adds no trace completeness at
either tier, and halves the token cost of self-report. Structural, not instructed, state
is the next mechanism to test.</td></tr>
<tr><td>Do procedures steer where goals do not?</td><td>Yes, on realistic tasks: 0.90 vs
0.35 checker compliance, 1.95 vs 0.60 judged adherence. Goal prompts comply only when the
policy already matches the model's defaults.</td></tr>
</table>

</main>
</body>
</html>"""

out = HERE / "mdz-analysis-phase-2.html"
out.write_text(HTML)
print("wrote", out, len(HTML), "bytes")
