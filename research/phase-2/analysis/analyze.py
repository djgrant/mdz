#!/usr/bin/env python3
"""Offline scoring for phase-2 results.

Reads phase-2/results/<exp>.jsonl + phase-2/programs/<exp>/manifest.json and writes
phase-2/analysis/metrics.json plus charts under phase-2/analysis/assets/.
Scoring happens here, never at run time (see ../DESIGN.md). Run from this directory,
after `npx tsx phase-2/src/score/run-checkers.ts` and `python3 judge.py` for E4.
"""
import json
import pathlib
import re

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams.update({
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": "#c9d2d9", "axes.linewidth": 0.8,
    "axes.grid": True, "axes.axisbelow": True,
    "grid.color": "#e7edf1", "grid.linewidth": 0.7,
    "axes.grid.axis": "y",
    "font.family": "Helvetica Neue", "font.size": 10,
    "axes.titlesize": 11, "axes.titleweight": "semibold",
    "figure.titlesize": 12, "figure.titleweight": "semibold",
    "legend.frameon": False,
    "xtick.color": "#5c6b78", "ytick.color": "#5c6b78",
    "axes.labelcolor": "#41505c", "text.color": "#16212b",
})

HERE = pathlib.Path(__file__).parent
PHASE = HERE.parent
RESULTS = PHASE / "results"
PROGRAMS = PHASE / "programs"
ASSETS = HERE / "assets"

MODEL_SUFFIX = re.compile(r"-(haiku|sonnet|opus|gpt-5\.4-mini|gpt-5\.5)-r\d+$")

C_A = "#0b7261"  # accent (matches phase-1 report)
C_B = "#b3541e"
C_C = "#5a6b7b"


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def load_jsonl(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def load_records(exp: str) -> list[dict]:
    """One experiment's JSONL, deduped by id, last record wins."""
    dedup = {}
    for r in load_jsonl(RESULTS / f"{exp}.jsonl"):
        dedup[r["id"]] = r
    return list(dedup.values())


def load_manifest(exp: str) -> dict[str, dict]:
    entries = json.loads((PROGRAMS / exp / "manifest.json").read_text())
    if isinstance(entries, dict):
        entries = entries["entries"]
    return {e["id"]: e for e in entries}


def entry_for(rid: str, manifest: dict[str, dict]) -> dict | None:
    eid = MODEL_SUFFIX.sub("", rid)
    return manifest.get(eid)


def ref_trace(entry: dict) -> list[dict] | None:
    if not entry.get("tracePath"):
        return None
    return json.loads((PHASE / entry["tracePath"]).read_text())


# ---------------------------------------------------------------------------
# Trace normalisation + LCS (ported from the phase-1 notebook)
# ---------------------------------------------------------------------------

def coerce(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip()
        try:
            return float(s)
        except ValueError:
            return s
    return v


def norm_step(s: dict):
    return (s.get("action"), s.get("var"), coerce(s.get("value")))


def lcs_len(a: list, b: list) -> int:
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            dp[i][j] = dp[i + 1][j + 1] + 1 if a[i] == b[j] else max(dp[i + 1][j], dp[i][j + 1])
    return dp[0][0]


def step_accuracy(model_steps, ref_steps) -> float:
    if not ref_steps:
        return float("nan")
    return lcs_len([norm_step(s) for s in model_steps],
                   [norm_step(s) for s in ref_steps]) / len(ref_steps)


FENCE_RE = re.compile(r"```(?:json\w*)?\s*\n(.*?)```", re.DOTALL)


def parse_fenced_trace(raw: str) -> list[dict] | None:
    """The model's trace: a fenced JSON array, or fenced JSON lines."""
    if not raw:
        return None
    for block in reversed(FENCE_RE.findall(raw)):
        block = block.strip()
        try:
            v = json.loads(block)
            if isinstance(v, list):
                return v
        except json.JSONDecodeError:
            pass
        lines, ok = [], True
        for line in block.splitlines():
            line = line.strip().rstrip(",")
            if not line or line in ("[", "]"):
                continue
            try:
                lines.append(json.loads(line))
            except json.JSONDecodeError:
                ok = False
                break
        if ok and lines:
            return lines
    return None


def parse_fenced_lines(raw: str) -> list[str] | None:
    """Fenced plain lines (E3 store arm emits)."""
    if not raw:
        return None
    blocks = FENCE_RE.findall(raw)
    if not blocks:
        return None
    return [l.strip() for l in blocks[-1].strip().splitlines() if l.strip()]


# ---------------------------------------------------------------------------
# E1 — strict mode
# ---------------------------------------------------------------------------

def score_e1(records, manifest) -> pd.DataFrame:
    rows = []
    for r in records:
        entry = entry_for(r["id"], manifest)
        if entry is None:
            continue
        v = entry["variant"]
        trace = parse_fenced_trace(r.get("rawOutput") or "")
        halt_steps = [s for s in (trace or []) if s.get("action") == "halt"]
        halted = bool(trace) and len(trace) <= 2 and bool(halt_steps)  # halt-shaped
        executed_past = bool(trace) and len(trace) > 2 and not halt_steps
        ref = ref_trace(entry)
        rows.append(dict(
            id=r["id"], model=r["model"], mode=v["mode"], condition=v["condition"],
            seed=v.get("seed"), parsed=trace is not None, halted=halted,
            any_halt=bool(halt_steps), executed_past=executed_past,
            step_accuracy=step_accuracy(trace or [], ref) if ref and not v["condition"].startswith("syntax") else np.nan,
            error=r.get("error"),
        ))
    return pd.DataFrame(rows)


def summarise_e1(df: pd.DataFrame) -> dict:
    out = {}
    faulted = df[df.condition != "clean"]
    clean = df[df.condition == "clean"]
    for mode in ("default", "strict"):
        f = faulted[faulted["mode"] == mode]
        c = clean[clean["mode"] == mode]
        out[mode] = dict(
            halt_rate=float(f.halted.mean()) if len(f) else None,
            repair_rate=float(f.executed_past.mean()) if len(f) else None,
            false_halt_rate=float(c.any_halt.mean()) if len(c) else None,
            clean_step_accuracy=float(c.step_accuracy.mean()) if len(c) else None,
            n_faulted=int(len(f)), n_clean=int(len(c)),
        )
    out["by_cell"] = (
        df.groupby(["mode", "condition", "model"])
        .agg(halt=("halted", "mean"), exec_past=("executed_past", "mean"),
             acc=("step_accuracy", "mean"), n=("id", "count"))
        .reset_index().to_dict("records")
    )
    return out


def chart_e1(df: pd.DataFrame):
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.8), sharey=True)
    faulted = df[df.condition != "clean"]
    for ax, cond, label in zip(axes, ("syntax", "type"),
                               ("syntax fault (FOR missing IN)", "type fault ($x: String = 6)")):
        sub = faulted[faulted.condition.str.startswith(cond)]
        piv = sub.groupby(["model", "mode"]).halted.mean().unstack()
        piv.plot.bar(ax=ax, color=[C_C, C_A], rot=0, legend=(cond == "syntax"))
        ax.set_title(label)
        ax.set_ylim(0, 1.05)
        ax.set_xlabel("")
    axes[0].set_ylabel("halt rate")
    fig.suptitle("Halt rate on faulted programs, by fault class", y=1.02)
    fig.tight_layout()
    fig.savefig(ASSETS / "e1-halt.png", dpi=160, bbox_inches="tight")
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 3.5))
    clean = df[df.condition == "clean"]
    piv = clean.groupby(["model", "mode"]).step_accuracy.mean().unstack()
    piv.plot.bar(ax=ax, color=[C_C, C_A], rot=0)
    ax.set_title("Clean-program step accuracy, default vs strict")
    ax.set_ylabel("step accuracy")
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("")
    fig.tight_layout()
    fig.savefig(ASSETS / "e1-tax.png", dpi=160)
    plt.close(fig)


# ---------------------------------------------------------------------------
# E2 — map-reduce
# ---------------------------------------------------------------------------

def attempted_delegations(rec: dict, canaries: list[str]) -> list[str]:
    """Wrong-mechanism delegation: TaskCreate todo items carrying the map payload.

    Observed with haiku: SPAWN gets pattern-matched onto the CLI's task-management
    tools (TaskCreate/TaskOutput) rather than the subagent tool, so the WITH payload
    lands in a todo item that never executes. Returns the payload strings.
    """
    tp = rec.get("transcriptPath")
    if not tp:
        return []
    path = PHASE / tp
    if not path.exists():
        return []
    payloads = []
    for line in path.read_text().splitlines():
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        msg = e.get("message") or {}
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for c in content:
            if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") == "TaskCreate":
                blob = json.dumps(c.get("input") or {})
                if any(can in blob for can in canaries):
                    payloads.append(blob)
    return payloads


def score_e2(records, manifest) -> pd.DataFrame:
    rows = []
    for r in records:
        entry = entry_for(r["id"], manifest)
        if entry is None:
            continue
        exp = entry.get("expected") or {}
        canaries = exp.get("canaries") or []
        lam = exp.get("lambda") or ""
        want = exp.get("spawnCount") or len(canaries)
        spawns = r.get("spawns") or []
        prompts = [s.get("prompt") or "" for s in spawns]
        raw = r.get("rawOutput") or ""
        cov = [sum(1 for p in prompts if c in p) for c in canaries]
        attempts = attempted_delegations(r, canaries) if not spawns else []
        if spawns:
            mechanism = "spawned"
        elif attempts:
            mechanism = "wrong-mechanism"
        else:
            mechanism = "inline"
        rows.append(dict(
            id=r["id"], model=r["model"], variant=entry["variant"].get("name") or entry["id"],
            n_spawns=len(spawns), expected_spawns=want, mechanism=mechanism,
            n_attempts=len(attempts),
            spawn_fidelity=min(len(spawns) / want, 1.0) if want else np.nan,
            item_coverage=(sum(1 for k in cov if k == 1) / len(canaries)) if canaries else np.nan,
            # payload fidelity counts either true spawns or wrong-mechanism payloads
            payload_coverage=(sum(1 for c in canaries if any(c in p for p in prompts + attempts)) / len(canaries)) if canaries else np.nan,
            lambda_fidelity=(sum(1 for p in prompts if lam in p) / len(prompts)) if (lam and prompts) else np.nan,
            aggregation=(sum(1 for c in canaries if c in raw) / len(canaries)) if canaries else np.nan,
            shortcut=(mechanism == "inline" and bool(raw.strip()) and not r.get("error")),
            error=r.get("error"),
        ))
    return pd.DataFrame(rows)


def chart_e2(df: pd.DataFrame):
    metrics = ["spawn_fidelity", "item_coverage", "payload_coverage", "aggregation"]
    labels = ["spawn fidelity", "item coverage", "payload coverage", "aggregation"]
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.2), sharey=True)
    for ax, model in zip(axes, sorted(df.model.unique())):
        sub = df[df.model == model].groupby("variant")[metrics].mean()
        sub.columns = labels
        sub.plot.bar(ax=ax, rot=15, color=[C_C, C_B, C_A, "#8859a8"], legend=(ax is axes[0]))
        ax.set_title(model)
        ax.set_ylim(0, 1.05)
        ax.set_xlabel("")
    axes[0].set_ylabel("score")
    fig.suptitle("Delegation fidelity by consumer variant", y=1.02)
    fig.tight_layout()
    fig.savefig(ASSETS / "e2-fidelity.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def chart_e2_mechanism(df: pd.DataFrame):
    """How each run performed its delegation: real spawns, the CLI's todo
    tools (wrong mechanism), or inline answering (shortcut)."""
    order = ["spawned", "wrong-mechanism", "inline"]
    display = {"spawned": "spawned worker", "wrong-mechanism": "wrong tool",
               "inline": "answered inline"}
    counts = (df.groupby(["model", "mechanism"]).size().unstack()
                .reindex(columns=order).fillna(0).rename(columns=display))
    fig, ax = plt.subplots(figsize=(6, 3.2))
    counts.plot.barh(ax=ax, stacked=True, color=[C_A, C_B, C_C])
    ax.grid(axis="x")
    ax.grid(False, axis="y")
    ax.set_title("Delegation mechanism per run (n=12 per model)")
    ax.set_xlabel("runs")
    ax.set_ylabel("")
    ax.legend(title="", loc="upper left", bbox_to_anchor=(1.02, 1.0))
    fig.tight_layout()
    fig.savefig(ASSETS / "e2-mechanism.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# E3 — state store
# ---------------------------------------------------------------------------

def score_e3(records, manifest) -> pd.DataFrame:
    rows = []
    for r in records:
        entry = entry_for(r["id"], manifest)
        if entry is None:
            continue
        ref = ref_trace(entry) or []
        ref_assigns = [s for s in ref if s.get("action") == "assign"]
        ref_emits = [coerce(s.get("value")) for s in ref if s.get("action") == "emit"]
        arm = entry.get("arm")
        raw = r.get("rawOutput") or ""
        if arm == "internal":
            trace = parse_fenced_trace(raw) or []
            acc = step_accuracy(trace, ref)
            emits = [coerce(s.get("value")) for s in trace if s.get("action") == "emit"]
            emit_acc = lcs_len(emits, ref_emits) / len(ref_emits) if ref_emits else np.nan
            assign_acc = step_accuracy([s for s in trace if s.get("action") == "assign"], ref_assigns)
        else:
            sets = [dict(action="assign", var=c.get("name"), value=c.get("value"))
                    for c in (r.get("stateLog") or []) if c.get("tool") == "set"]
            assign_acc = step_accuracy(sets, ref_assigns)
            emits = [coerce(l) for l in (parse_fenced_lines(raw) or [])]
            emit_acc = lcs_len(emits, ref_emits) / len(ref_emits) if ref_emits else np.nan
            acc = np.nan
        state_log = r.get("stateLog") or []
        rows.append(dict(
            id=r["id"], model=r["model"], arm=arm,
            size=entry["variant"].get("statements"), seed=entry["variant"].get("seed"),
            n_sets=sum(1 for c in state_log if c.get("tool") == "set"),
            n_gets=sum(1 for c in state_log if c.get("tool") == "get"),
            ref_assigns=len(ref_assigns),
            full_acc=acc, assign_acc=assign_acc, emit_acc=emit_acc,
            completion_tokens=r.get("completionTokens"), duration_s=(r.get("durationMs") or 0) / 1000,
            cost=r.get("costUsd"), error=r.get("error"),
        ))
    return pd.DataFrame(rows)


def chart_e3(df: pd.DataFrame):
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.8))
    for ax, metric, title in zip(
        axes, ["assign_acc", "emit_acc", "completion_tokens"],
        ["assign accuracy", "emit accuracy", "completion tokens"],
    ):
        piv = df[df.model == "haiku"].groupby(["size", "arm"])[metric].mean().unstack()
        piv.plot.bar(ax=ax, color=[C_C, C_A], rot=0, legend=(metric == "assign_acc"))
        ax.set_title(title, fontsize=10)
        ax.set_xlabel("program size (statements)")
        if metric != "completion_tokens":
            ax.set_ylim(0, 1.05)
    fig.suptitle("Internal execution vs external state store (haiku)", y=1.02)
    fig.tight_layout()
    fig.savefig(ASSETS / "e3-store.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def chart_e3_journal(df: pd.DataFrame):
    """Store-arm journaling compression: set calls made vs assignments the
    reference trace requires, one bar pair per run."""
    sub = df[df.arm == "store"].sort_values(["size", "id"]).reset_index(drop=True)
    labels = [f"{r.model} · {r['size']} stmts · {r.id.split('-')[2]} r{r.id[-1]}"
              for _, r in sub.iterrows()]
    y = np.arange(len(sub))
    fig, ax = plt.subplots(figsize=(9, 0.42 * len(sub) + 1.2))
    ax.barh(y + 0.2, sub.ref_assigns, height=0.38, color=C_C, label="reference assignments")
    ax.barh(y - 0.2, sub.n_sets, height=0.38, color=C_B, label="set calls made")
    ax.set_yticks(y, labels, fontsize=8)
    ax.invert_yaxis()
    ax.grid(axis="x")
    ax.grid(False, axis="y")
    ax.set_xlabel("count")
    ax.set_title("Store arm: set calls made vs assignments required, per run")
    ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1.0))
    fig.tight_layout()
    fig.savefig(ASSETS / "e3-journal.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# E4 — procedure vs goal
# ---------------------------------------------------------------------------

def score_e4() -> pd.DataFrame:
    checks = {c["id"]: c for c in load_jsonl(RESULTS / "e4-checks.jsonl")}
    judges = {j["id"]: j for j in load_jsonl(RESULTS / "e4-judge.jsonl")}
    rows = []
    for rid, c in checks.items():
        j = judges.get(rid, {})
        verdict = (j.get("verdict") or {})
        rows.append(dict(
            id=rid, entryId=c["entryId"], arm=c["arm"], model=c.get("model"),
            compliant=bool(c["pass"]), note=c.get("note"),
            adherence=verdict.get("score"),
        ))
    return pd.DataFrame(rows)


def chart_e4(df: pd.DataFrame):
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.8))
    piv = df.groupby(["model", "arm"]).compliant.mean().unstack()
    piv.columns = ["MDZ procedure", "goal prompt"]
    piv.plot.bar(ax=axes[0], color=[C_A, C_C], rot=0)
    axes[0].set_title("checker pass rate")
    axes[0].set_ylabel("pass rate")
    axes[0].set_ylim(0, 1.05)
    axes[0].set_xlabel("")
    piv2 = df.groupby(["model", "arm"]).adherence.mean().unstack()
    piv2.columns = ["MDZ procedure", "goal prompt"]
    piv2.plot.bar(ax=axes[1], color=[C_A, C_C], rot=0)
    axes[1].set_title("judge score: did the reply follow the procedure?")
    axes[1].set_ylabel("mean judge score (0–2)")
    axes[1].set_ylim(0, 2.1)
    axes[1].set_xlabel("")
    fig.suptitle("Decision compliance and process adherence, procedure vs goal", y=1.02)
    fig.tight_layout()
    fig.savefig(ASSETS / "e4-compliance.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def chart_e4_tasks(df: pd.DataFrame):
    """Per-task dumbbell: goal-arm vs procedure-arm pass rate, models pooled."""
    d = df.copy()
    d["task"] = d.entryId.str.replace("^e4-", "", regex=True).str.replace("-[AB]$", "", regex=True)
    piv = (d.groupby(["task", "arm"]).compliant.mean().unstack()
             .sort_values("B-goal"))
    y = np.arange(len(piv))
    fig, ax = plt.subplots(figsize=(8, 0.42 * len(piv) + 1.2))
    for yi, (goal, proc) in zip(y, piv[["B-goal", "A-procedure"]].values):
        ax.plot([goal, proc], [yi, yi], color="#c9d2d9", lw=2, zorder=1)
    ax.scatter(piv["B-goal"], y, color=C_C, s=55, zorder=2, label="goal prompt")
    ax.scatter(piv["A-procedure"], y, color=C_A, s=55, zorder=2, label="MDZ procedure")
    ax.set_yticks(y, piv.index, fontsize=9)
    ax.set_xlim(-0.05, 1.05)
    ax.set_xlabel("checker pass rate (both models pooled)")
    ax.set_title("Decision compliance by task, goal vs procedure")
    ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1.0), frameon=False)
    ax.grid(axis="x", color="#eef2f4")
    fig.tight_layout()
    fig.savefig(ASSETS / "e4-tasks.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------

def main():
    ASSETS.mkdir(exist_ok=True)
    metrics: dict = {}

    e1 = score_e1(load_records("e1"), load_manifest("e1"))
    if len(e1):
        metrics["e1"] = summarise_e1(e1)
        chart_e1(e1)
        e1.to_json(HERE / "e1-scored.json", orient="records")

    e2 = score_e2(load_records("e2"), load_manifest("e2"))
    if len(e2):
        metrics["e2"] = dict(
            by_variant=e2.groupby(["variant", "model"])[
                ["spawn_fidelity", "item_coverage", "payload_coverage", "lambda_fidelity", "aggregation"]
            ].mean().reset_index().to_dict("records"),
            mechanism=e2.groupby(["model", "mechanism"]).size().reset_index(name="n").to_dict("records"),
            shortcut_rate=float(e2.shortcut.mean()),
            n=int(len(e2)),
        )
        chart_e2(e2)
        chart_e2_mechanism(e2)
        e2.to_json(HERE / "e2-scored.json", orient="records")

    e3 = score_e3(load_records("e3"), load_manifest("e3"))
    if len(e3):
        metrics["e3"] = e3.groupby(["size", "arm"]).agg(
            assign_acc=("assign_acc", "mean"), emit_acc=("emit_acc", "mean"),
            tokens=("completion_tokens", "mean"), wall_s=("duration_s", "mean"),
            n=("id", "count"),
        ).reset_index().to_dict("records")
        chart_e3(e3)
        chart_e3_journal(e3)
        e3.to_json(HERE / "e3-scored.json", orient="records")

    e4 = score_e4()
    if len(e4):
        metrics["e4"] = dict(
            compliance=e4.groupby(["arm", "model"]).compliant.mean().reset_index().to_dict("records"),
            adherence=e4.groupby(["arm"]).adherence.mean().to_dict(),
            n=int(len(e4)),
        )
        chart_e4(e4)
        chart_e4_tasks(e4)
        e4.to_json(HERE / "e4-scored.json", orient="records")

    (HERE / "metrics.json").write_text(json.dumps(metrics, indent=2, default=float))
    print(json.dumps({k: "ok" for k in metrics}, indent=2))


if __name__ == "__main__":
    main()
