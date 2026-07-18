#!/usr/bin/env python3
"""Pairwise LLM judge for E2c rewrite outputs.

Compares rewritten report.md files pairwise across arms for the same repeat:
the judge sees the original report, the writing requirements (verbatim, the
same doc every arm received), and both candidates, order counterbalanced.
Judged on requirements satisfaction, not brevity; a candidate that altered
factual claims or numbers loses regardless of style.

Reads phase-3/results/e2c.jsonl; the rewritten report is the run's archived
sandbox copy (results/sandboxes/<id>/report.md). Writes
phase-3/results/e2c-judge.jsonl, resumable by pair id. --dry-run prints one
assembled prompt pair without calling any model.
"""
import itertools
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
PHASE = HERE.parent.parent
RESULTS = PHASE / "results"
OUT = RESULTS / "e2c-judge.jsonl"
JUDGE_MODEL = "opus"

PROMPT = """You are judging two rewrites of the same report against an explicit set of \
writing requirements. Both rewrites received exactly these requirements.

<requirements>
{requirements}
</requirements>

<original-report>
{original}
</original-report>

<rewrite-A>
{candidate_a}
</rewrite-A>

<rewrite-B>
{candidate_b}
</rewrite-B>

Score each rewrite against the requirements in two parts:
- skeleton: judge the headings and captions alone against the Skeleton assessment section
- paragraphs: judge the body against the Paragraph-by-paragraph assessment section

A rewrite that changed the report's factual claims or numbers loses regardless of \
style. Do not reward brevity for its own sake; the requirements are the rubric. Do \
not assume either rewrite is the better one from its position.

Reply with exactly one line of JSON:
{{"skeleton": {{"winner": "A"|"B"|"tie", "reason": "<one sentence>"}}, "paragraphs": {{"winner": "A"|"B"|"tie", "reason": "<one sentence>"}}, "overall": {{"winner": "A"|"B"|"tie", "reason": "<one sentence>"}}}}"""


def load_jsonl(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def read_output(rec: dict) -> str | None:
    path = RESULTS / "sandboxes" / rec["id"] / "report.md"
    if not path.exists():
        return None
    return path.read_text()


def original_report() -> str:
    return (PHASE / "src" / "generate" / "fixtures" / "e2c" / "report.md").read_text()


def requirements() -> str:
    manifest = json.loads((PHASE / "programs" / "e2c" / "manifest.json").read_text())
    return manifest[0]["sandbox"]["requirements.md"]


def arm_of(rid: str) -> str:
    """e2c-<arm...>-r<rep> -> the arm+cell part (e.g. skill-opus-opus)."""
    m = re.match(r"^e2c-(.+)-r\d+$", rid)
    return m.group(1) if m else rid


def build_pairs(records: dict[str, dict]) -> list[tuple[str, str, str, dict, dict]]:
    """Every pair of distinct cells sharing a repeat index."""
    by_rep: dict[str, list[str]] = {}
    for rid in sorted(records):
        rep = rid.rsplit("-", 1)[-1]
        by_rep.setdefault(rep, []).append(rid)
    pairs = []
    for rep, rids in sorted(by_rep.items()):
        for left_id, right_id in itertools.combinations(rids, 2):
            left, right = arm_of(left_id), arm_of(right_id)
            pairs.append((f"e2c-{left}-vs-{right}-{rep}", left, right,
                          records[left_id], records[right_id]))
    return pairs


def assemble(reqs: str, original: str, left: str, right: str,
             left_out: str, right_out: str, pair_index: int):
    left_first = pair_index % 2 == 0
    a, b = (left_out, right_out) if left_first else (right_out, left_out)
    prompt = PROMPT.format(requirements=reqs, original=original, candidate_a=a, candidate_b=b)
    order = {"A": left, "B": right} if left_first else {"A": right, "B": left}
    return prompt, order


def parse_verdict(raw: str) -> dict:
    try:
        line = next(l for l in raw.splitlines() if l.strip().startswith("{"))
        return json.loads(line)
    except (json.JSONDecodeError, StopIteration):
        return {}


def dry_run() -> None:
    original = original_report()
    stand_in = "(stand-in candidate: the original, unchanged)\n\n" + original
    for index in (0, 1):
        prompt, order = assemble(requirements(), original, "skill-opus", "goal-opus",
                                 stand_in, stand_in, index)
        print(f"=== pair index {index} (A={order['A']}, B={order['B']}) ===")
        print(prompt[:1500])
        print()


def main() -> None:
    if "--dry-run" in sys.argv:
        dry_run()
        return

    records: dict[str, dict] = {}
    for r in load_jsonl(RESULTS / "e2c.jsonl"):
        if not r.get("error"):
            records[r["id"]] = r  # last wins
    done = {r["id"] for r in load_jsonl(OUT)}

    reqs = requirements()
    original = original_report()
    for index, (pair_id, left, right, left_rec, right_rec) in enumerate(build_pairs(records)):
        if pair_id in done:
            continue
        left_out = read_output(left_rec)
        right_out = read_output(right_rec)
        if left_out is None or right_out is None:
            print(f"skip {pair_id}: missing report.md", file=sys.stderr)
            continue
        prompt, order = assemble(reqs, original, left, right, left_out, right_out, index)
        proc = subprocess.run(
            ["claude", "-p", prompt, "--model", JUDGE_MODEL, "--output-format", "json"],
            capture_output=True, text=True, timeout=600,
        )
        raw = ""
        try:
            raw = json.loads(proc.stdout).get("result", "")
        except json.JSONDecodeError:
            pass
        verdict = parse_verdict(raw)

        def arm_for(part: str):
            w = verdict.get(part, {}).get("winner")
            return order.get(w, w)

        row = {"id": pair_id, "order": order, "judge": JUDGE_MODEL, "verdict": verdict,
               "winnerArm": {p: arm_for(p) for p in ("skeleton", "paragraphs", "overall")},
               "raw": raw[:2000]}
        with OUT.open("a") as f:
            f.write(json.dumps(row) + "\n")
        print(f"{pair_id}: {row['winnerArm']}")


if __name__ == "__main__":
    main()
