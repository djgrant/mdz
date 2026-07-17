#!/usr/bin/env python3
"""Pairwise LLM judge for E2b simplification outputs (see ../../DESIGN.md).

Compares the skill arm's final output against the goal arm's for the same
target, model, and repeat: the judge sees the original module plus both
candidates, order counterbalanced across pairs, and returns a structured JSON
verdict. This comparison happens across runs, in scoring — it is not part of
the agent's own run. The deterministic test gate lives in e2b-score.ts; a
candidate whose tests fail loses regardless of the verdict recorded here.

Expects phase-3/results/e2b.jsonl records with:
  id          <entry-id>-<model>-r<rep>, e.g. e2b-pricing-skill-sonnet-r1
  outputPath  the run's final copy of the target module, relative to phase-3/

Writes phase-3/results/e2b-judge.jsonl, resumable by pair id. Run from this
directory. --dry-run assembles and prints the prompts for one pair (both
orders) from the generated manifest, with the original module standing in for
both candidates; no model calls.
"""
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
PHASE = HERE.parent.parent
RESULTS = PHASE / "results"
OUT = RESULTS / "e2b-judge.jsonl"
JUDGE_MODEL = "sonnet"

PROMPT = """You are judging two attempts to simplify the same module. Both were required to \
preserve behaviour and the public interface; you are judging which is the better \
simplification of the original.

<original>
{original}
</original>

<candidate-A>
{candidate_a}
</candidate-A>

<candidate-B>
{candidate_b}
</candidate-B>

Judge which candidate most improves the original: more direct, more obvious, and \
smaller, while staying clear and complete. Do not reward cleverness or density for \
its own sake, and do not assume either candidate is the better one from its position.

Reply with exactly one line of JSON: {{"winner": "A"|"B"|"tie", "reason": "<one sentence>"}}"""


def load_jsonl(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def read_output(rec: dict) -> str | None:
    rel = rec.get("outputPath")
    if not rel:
        return None
    path = pathlib.Path(rel)
    if not path.is_absolute():
        path = PHASE / path
    if not path.exists():
        return None
    return path.read_text()


def build_pairs(records: dict[str, dict]) -> list[tuple[str, dict, dict]]:
    """Pair skill and goal runs sharing target, model, and repeat."""
    pairs = []
    for rid, rec in sorted(records.items()):
        m = re.match(r"^e2b-([a-z0-9]+)-skill-(.+)$", rid)
        if not m:
            continue
        target, suffix = m.groups()
        goal = records.get(f"e2b-{target}-goal-{suffix}")
        if goal is None:
            continue
        pairs.append((f"e2b-{target}-{suffix}", rec, goal))
    return pairs


def assemble(original: str, skill_out: str, goal_out: str, pair_index: int):
    """Counterbalance: even pairs put the skill arm at A, odd pairs at B."""
    skill_first = pair_index % 2 == 0
    a, b = (skill_out, goal_out) if skill_first else (goal_out, skill_out)
    prompt = PROMPT.format(original=original, candidate_a=a, candidate_b=b)
    order = {"A": "skill", "B": "goal"} if skill_first else {"A": "goal", "B": "skill"}
    return prompt, order


def parse_verdict(raw: str) -> dict:
    verdict = {"winner": None, "reason": None}
    try:
        line = next(l for l in raw.splitlines() if l.strip().startswith("{"))
        verdict = json.loads(line)
    except (json.JSONDecodeError, StopIteration):
        pass
    return verdict


def original_for(target: str) -> str:
    fixture = PHASE / "src" / "generate" / "fixtures" / "e2b" / target / f"{target}.ts"
    return fixture.read_text()


def dry_run() -> None:
    manifest = load_jsonl_or_json(PHASE / "programs" / "e2b" / "manifest.json")
    entry = next(e for e in manifest if e["variant"]["arm"] == "skill")
    target = entry["variant"]["target"]
    original = original_for(target)
    stand_in = "// (stand-in candidate: the original, unchanged)\n" + original
    for index in (0, 1):
        prompt, order = assemble(original, stand_in, stand_in, index)
        print(f"=== pair index {index} (A={order['A']}, B={order['B']}) ===")
        print(prompt)
        print()


def load_jsonl_or_json(path: pathlib.Path) -> list[dict]:
    return json.loads(path.read_text())


def main() -> None:
    if "--dry-run" in sys.argv:
        dry_run()
        return

    records: dict[str, dict] = {}
    for r in load_jsonl(RESULTS / "e2b.jsonl"):
        if not r.get("error"):
            records[r["id"]] = r  # last wins
    done = {r["id"] for r in load_jsonl(OUT)}

    for index, (pair_id, skill_rec, goal_rec) in enumerate(build_pairs(records)):
        if pair_id in done:
            continue
        target = pair_id.split("-")[1]
        skill_out = read_output(skill_rec)
        goal_out = read_output(goal_rec)
        if skill_out is None or goal_out is None:
            print(f"skip {pair_id}: missing output file", file=sys.stderr)
            continue
        prompt, order = assemble(original_for(target), skill_out, goal_out, index)
        proc = subprocess.run(
            ["claude", "-p", prompt, "--model", JUDGE_MODEL, "--output-format", "json"],
            capture_output=True, text=True, timeout=300,
        )
        raw = ""
        try:
            raw = json.loads(proc.stdout).get("result", "")
        except json.JSONDecodeError:
            pass
        verdict = parse_verdict(raw)
        winner_arm = order.get(verdict.get("winner")) if verdict.get("winner") in order else verdict.get("winner")
        row = {"id": pair_id, "target": target, "order": order, "judge": JUDGE_MODEL,
               "verdict": verdict, "winnerArm": winner_arm, "raw": raw[:2000]}
        with OUT.open("a") as f:
            f.write(json.dumps(row) + "\n")
        print(f"{pair_id}: {verdict} -> {winner_arm}")


if __name__ == "__main__":
    main()
