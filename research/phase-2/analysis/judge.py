#!/usr/bin/env python3
"""LLM-as-judge for E4 process adherence (see ../DESIGN.md).

For each e4 record, asks a judge model to score how faithfully the output follows the
written procedure: 0 (ignored), 1 (partial), 2 (followed). The judge sees the procedure
and the output; it is scoring recognisable compliance, not solving the task itself.
Writes phase-2/results/e4-judge.jsonl, resumable by record id. Run from this directory.
"""
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
PHASE = HERE.parent
RESULTS = PHASE / "results"
OUT = RESULTS / "e4-judge.jsonl"
JUDGE_MODEL = "sonnet"

PROMPT = """You are scoring whether an AI assistant's output followed a written procedure.

<procedure>
{procedure}
</procedure>

<task-input>
{task}
</task-input>

<output>
{output}
</output>

Score process adherence:
- 2: the output is consistent with having followed the procedure step by step
- 1: the output partially reflects the procedure but skips or alters material steps
- 0: the output ignores the procedure (it may still be a plausible answer)

Reply with exactly one line of JSON: {{"score": 0|1|2, "reason": "<one sentence>"}}"""


def load_jsonl(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def main():
    manifest = {e["id"]: e for e in json.loads((PHASE / "programs/e4/manifest.json").read_text())}
    records = {}
    for r in load_jsonl(RESULTS / "e4.jsonl"):
        records[r["id"]] = r  # last wins
    done = {r["id"] for r in load_jsonl(OUT)}

    for rid, rec in sorted(records.items()):
        if rid in done or rec.get("error"):
            continue
        eid = next((k for k in manifest if rid.startswith(k)), None)
        if eid is None:
            print(f"skip {rid}: no manifest entry", file=sys.stderr)
            continue
        entry = manifest[eid]
        expected = entry.get("expected") or {}
        prompt = PROMPT.format(
            procedure=expected.get("procedureText", "(missing)"),
            task=entry.get("variant", {}).get("input", "(see output)"),
            output=(rec.get("rawOutput") or "")[:8000],
        )
        proc = subprocess.run(
            ["claude", "-p", prompt, "--model", JUDGE_MODEL, "--output-format", "json"],
            capture_output=True, text=True, timeout=180,
        )
        verdict = {"score": None, "reason": None}
        raw = ""
        try:
            payload = json.loads(proc.stdout)
            raw = payload.get("result", "")
            line = next(l for l in raw.splitlines() if l.strip().startswith("{"))
            verdict = json.loads(line)
        except (json.JSONDecodeError, StopIteration):
            pass
        row = {"id": rid, "entryId": eid, "arm": entry.get("arm"),
               "judge": JUDGE_MODEL, "verdict": verdict, "raw": raw[:2000]}
        with OUT.open("a") as f:
            f.write(json.dumps(row) + "\n")
        print(f"{rid}: {verdict}")


if __name__ == "__main__":
    main()
