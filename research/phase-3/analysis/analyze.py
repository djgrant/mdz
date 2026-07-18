#!/usr/bin/env python3
"""Offline scoring + aggregation for phase-3 results.

Reads phase-3/results/*.jsonl and writes phase-3/analysis/summary.json plus
charts under phase-3/analysis/charts/. Scoring happens here, never at run time.
Run from this directory: uv run --with numpy,pandas,matplotlib python3 analyze.py
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
CHARTS = HERE / "charts"

C_A = "#0b7261"   # MDZ / procedure accent
C_B = "#b3541e"   # contrast
C_C = "#5a6b7b"   # neutral
C_D = "#8859a8"   # extra


def load_jsonl(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def load_records(name: str) -> list[dict]:
    """Deduped by id, last record wins (re-runs of errored entries append later)."""
    dedup = {}
    for r in load_jsonl(RESULTS / f"{name}.jsonl"):
        dedup[r["id"]] = r
    return list(dedup.values())


# ---------------------------------------------------------------------------
# Trace normalisation + LCS (the phase-2 e3b scoring, carried over verbatim)
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
    if not raw:
        return None
    blocks = FENCE_RE.findall(raw)
    if not blocks:
        return None
    return [l.strip() for l in blocks[-1].strip().splitlines() if l.strip()]


# ---------------------------------------------------------------------------
# E1 — kill-and-resume (verdicts precomputed in e1-checks.jsonl)
# ---------------------------------------------------------------------------

E1_METRICS = ["resumptionAccuracy", "repeatRate", "skipRate", "completion"]
ARM_LABELS = {"A-procedure": "MDZ procedure", "C-rules": "prose rules"}
ARM_COLORS = {"A-procedure": C_A, "C-rules": C_B}


def score_e1() -> pd.DataFrame:
    df = pd.DataFrame(load_jsonl(RESULTS / "e1-checks.jsonl"))
    return df


def chart_e1(df: pd.DataFrame):
    labels = ["resumption accuracy", "repeat rate", "skip rate", "completion"]
    fig, axes = plt.subplots(1, 4, figsize=(13, 3.6), sharey=True)
    for ax, m, lab in zip(axes, E1_METRICS, labels):
        piv = df.groupby(["model", "arm"])[m].mean().unstack()[list(ARM_LABELS)]
        piv.columns = [ARM_LABELS[a] for a in ARM_LABELS]
        piv.plot.bar(ax=ax, color=[ARM_COLORS[a] for a in ARM_LABELS], rot=0,
                     legend=(m == E1_METRICS[0]))
        ax.set_title(lab, fontsize=10)
        ax.set_ylim(0, 1.05)
        ax.set_xlabel("")
    axes[0].set_ylabel("mean over runs")
    fig.suptitle("E1: resuming a killed runbook — procedure vs prose rules, by model", y=1.04)
    fig.tight_layout()
    fig.savefig(CHARTS / "e1-metrics.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def chart_e1_cuts(df: pd.DataFrame):
    fig, axes = plt.subplots(2, 2, figsize=(10, 6.6))
    for row, (cut, values) in enumerate([("evidence", ["log", "fx"]),
                                         ("killPoint", ["early", "late"])]):
        for col, m in enumerate(["resumptionAccuracy", "repeatRate"]):
            ax = axes[row][col]
            sub = df.copy()
            sub["cell"] = sub.model + " · " + sub[cut]
            order = [f"{mo} · {v}" for mo in sorted(df.model.unique()) for v in values]
            piv = sub.groupby(["cell", "arm"])[m].mean().unstack().reindex(order)[list(ARM_LABELS)]
            piv.columns = [ARM_LABELS[a] for a in ARM_LABELS]
            piv.plot.bar(ax=ax, color=[ARM_COLORS[a] for a in ARM_LABELS], rot=15,
                         legend=(row == 0 and col == 0))
            ax.set_title(f"{m} by {cut}", fontsize=10)
            ax.set_ylim(0, 1.05)
            ax.set_xlabel("")
    fig.suptitle("E1 cuts: evidence level (full log vs side effects only) and kill point", y=1.0)
    fig.tight_layout()
    fig.savefig(CHARTS / "e1-cuts.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def chart_e1_repeats(df: pd.DataFrame):
    """Side-effectful repeats: mean repeated events per run, and share of runs
    with at least one repeated side effect."""
    fig, axes = plt.subplots(1, 2, figsize=(9.5, 3.6))
    piv = df.groupby(["model", "arm"]).repeatEvents.mean().unstack()[list(ARM_LABELS)]
    piv.columns = [ARM_LABELS[a] for a in ARM_LABELS]
    piv.plot.bar(ax=axes[0], color=[ARM_COLORS[a] for a in ARM_LABELS], rot=0)
    axes[0].set_title("repeated side-effectful actions per run")
    axes[0].set_ylabel("mean events")
    axes[0].set_xlabel("")
    any_rep = (df.assign(any_repeat=df.repeatEvents > 0)
                 .groupby(["model", "arm"]).any_repeat.mean().unstack()[list(ARM_LABELS)])
    any_rep.columns = [ARM_LABELS[a] for a in ARM_LABELS]
    any_rep.plot.bar(ax=axes[1], color=[ARM_COLORS[a] for a in ARM_LABELS], rot=0, legend=False)
    axes[1].set_title("runs with ≥1 repeated side effect")
    axes[1].set_ylabel("share of runs")
    axes[1].set_ylim(0, 1.05)
    axes[1].set_xlabel("")
    fig.suptitle("E1: the double-refund risk — side-effectful repeats", y=1.04)
    fig.tight_layout()
    fig.savefig(CHARTS / "e1-repeats.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def summarise_e1(df: pd.DataFrame) -> dict:
    def cell(sub):
        return {m: round(float(sub[m].mean()), 3) for m in E1_METRICS} | {
            "repeatEvents": round(float(sub.repeatEvents.mean()), 2), "n": int(len(sub))}
    out = {"by_arm_model": {}, "by_evidence": {}, "by_killpoint": {}}
    for (mo, a), sub in df.groupby(["model", "arm"]):
        out["by_arm_model"][f"{mo}|{a}"] = cell(sub)
    for (mo, a, e), sub in df.groupby(["model", "arm", "evidence"]):
        out["by_evidence"][f"{mo}|{a}|{e}"] = cell(sub)
    for (mo, a, k), sub in df.groupby(["model", "arm", "killPoint"]):
        out["by_killpoint"][f"{mo}|{a}|{k}"] = cell(sub)
    return out


# ---------------------------------------------------------------------------
# E2a — optimise (objective selection)
# ---------------------------------------------------------------------------

def score_e2a() -> pd.DataFrame:
    scores = {s["id"]: s for s in load_jsonl(RESULTS / "e2a-scores.jsonl")}
    runs = {r["id"]: r for r in load_records("e2a")}
    rows = []
    for rid, s in scores.items():
        parts = rid.split("-")
        r = runs.get(rid, {})
        rows.append(dict(
            id=rid, target=s["target"], variant=parts[2], model=parts[3],
            testsPass=bool(s["testsPass"]), speedup=s["speedup"],
            benchMs=s["benchMs"], baselineMs=s["baselineMs"],
            n_spawns=len(r.get("spawns") or []),
            completion_tokens=int(r.get("completionTokens") or 0),
        ))
    return pd.DataFrame(rows)


E2_VARIANTS = ["mdz", "goal", "ralph"]
E2_COLORS = {"mdz": C_A, "goal": C_C, "ralph": C_B, "skill": C_A}
E2_LABELS = {"mdz": "MDZ skill", "goal": "goal prompt", "ralph": "ralph loop", "skill": "MDZ skill"}
E2B_VARIANTS = ["skill", "goal", "ralph"]


def chart_e2a(df: pd.DataFrame):
    fig, axes = plt.subplots(1, 2, figsize=(10, 4), sharey=True)
    rng = np.random.default_rng(7)
    for ax, target in zip(axes, sorted(df.target.unique())):
        sub = df[df.target == target]
        for i, v in enumerate(E2_VARIANTS):
            vals = sub[sub.variant == v].speedup
            x = i + rng.uniform(-0.14, 0.14, len(vals))
            ax.scatter(x, vals, color=E2_COLORS[v], s=42, alpha=0.75, zorder=3,
                       label=E2_LABELS[v] if target == sorted(df.target.unique())[0] else None)
            ax.hlines(vals.median(), i - 0.28, i + 0.28, color=E2_COLORS[v], lw=2.2, zorder=4)
        ax.set_yscale("log")
        ax.set_xticks(range(3), [E2_LABELS[v] for v in E2_VARIANTS])
        ax.set_title(target)
        ax.axhline(1, color="#c9d2d9", lw=1)
    axes[0].set_ylabel("speedup over baseline (log scale)")
    axes[0].legend(loc="upper left")
    fig.suptitle("E2a: shipped speedup by variant and target (bars = medians, n=6 per cell)", y=1.02)
    fig.tight_layout()
    fig.savefig(CHARTS / "e2a-speedup.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def summarise_e2a(df: pd.DataFrame) -> dict:
    out = {"tests_pass_rate": float(df.testsPass.mean()), "n": int(len(df)),
           "median_speedup": {}, "spawns": {}}
    for (t, v), sub in df.groupby(["target", "variant"]):
        out["median_speedup"][f"{t}|{v}"] = round(float(sub.speedup.median()), 2)
    for v, sub in df.groupby("variant"):
        out["median_speedup"][f"all|{v}"] = round(float(sub.speedup.median()), 2)
        out["spawns"][v] = round(float(sub.n_spawns.mean()), 2)
    return out


# ---------------------------------------------------------------------------
# E2b — simplify (subjective selection)
# ---------------------------------------------------------------------------

def score_e2b() -> tuple[pd.DataFrame, pd.DataFrame]:
    scores = pd.DataFrame(load_jsonl(RESULTS / "e2b-scores.jsonl"))
    scores["model"] = scores.id.str.extract(r"-(haiku|sonnet)-r\d+$")
    judges = []
    for j in load_jsonl(RESULTS / "e2b-judge.jsonl"):
        m = re.match(r"e2b-(\w+)-(\w+)-vs-(\w+)-(haiku|sonnet)-r(\d+)", j["id"])
        if not m or not j.get("winnerArm"):
            continue
        left, right = m.group(2), m.group(3)
        judges.append(dict(id=j["id"], target=m.group(1), model=m.group(4), rep=int(m.group(5)),
                           pairing="-vs-".join(sorted([left, right])),
                           winner=j["winnerArm"],
                           loser=left if j["winnerArm"] == right else right))
    return scores, pd.DataFrame(judges)


def chart_e2b(scores: pd.DataFrame, judge: pd.DataFrame):
    fig, axes = plt.subplots(1, 3, figsize=(13, 3.8))
    # judge win matrix
    ax = axes[0]
    if len(judge):
        piv = (judge.groupby(["pairing", "winner"]).size().unstack().fillna(0)
                    .reindex(columns=E2B_VARIANTS).dropna(axis=1, how="all"))
        piv.rename(columns=E2_LABELS).plot.barh(
            ax=ax, stacked=True, color=[E2_COLORS[v] for v in piv.columns])
        ax.grid(axis="x")
        ax.grid(False, axis="y")
        ax.set_title("judge wins per pairing")
        ax.set_xlabel("verdicts")
        ax.set_ylabel("")
        ax.legend(loc="upper left", bbox_to_anchor=(0, -0.18), ncols=3, fontsize=8)
    # test gate
    ax = axes[1]
    piv = scores.groupby(["model", "variant"]).testsPass.mean().unstack()[E2B_VARIANTS]
    piv.columns = [E2_LABELS[v] for v in E2B_VARIANTS]
    piv.plot.bar(ax=ax, color=[E2_COLORS[v] for v in E2B_VARIANTS], rot=0, legend=False)
    ax.set_title("test-gate pass rate")
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("")
    # spawn fidelity
    ax = axes[2]
    sub = scores[scores.variant == "skill"]
    piv = sub.groupby("model").agg(worker_spawns=("workerSpawns", "mean"),
                                   judge_spawn=("judgeSpawn", "mean"))
    x = np.arange(len(piv))
    ax.bar(x - 0.18, piv.worker_spawns, 0.34, color=C_A, label="worker spawns (mean)")
    ax2 = ax.twinx()
    ax2.bar(x + 0.18, piv.judge_spawn, 0.34, color=C_D, label="judge-spawn rate")
    ax2.set_ylim(0, 1.05)
    ax2.spines.top.set_visible(False)
    ax.set_xticks(x, piv.index)
    ax.set_title("skill arm: spawn fidelity (9 workers + 1 judge expected)")
    ax.axhline(9, color="#c9d2d9", lw=1, ls="--")
    h1, l1 = ax.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    ax.legend(h1 + h2, l1 + l2, loc="upper left", bbox_to_anchor=(0, -0.18), ncols=2, fontsize=8)
    fig.suptitle("E2b: subjective selection — judge verdicts, test gate, mechanism", y=1.04)
    fig.tight_layout()
    fig.savefig(CHARTS / "e2b-judge.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def summarise_e2b(scores: pd.DataFrame, judge: pd.DataFrame) -> dict:
    out = {"n_runs": int(len(scores)), "n_judge": int(len(judge)),
           "tests_pass_rate": float(scores.testsPass.mean()),
           "wins": {}, "win_rates": {}, "mechanism": {}}
    if len(judge):
        for p, sub in judge.groupby("pairing"):
            out["wins"][p] = sub.winner.value_counts().to_dict()
        overall = judge.winner.value_counts()
        appearances = judge.pairing.str.split("-vs-").explode().value_counts()
        for v in E2B_VARIANTS:
            if v in appearances:
                out["win_rates"][v] = round(float(overall.get(v, 0) / appearances[v]), 3)
    skill = scores[scores.variant == "skill"]
    out["mechanism"] = dict(
        skill_mean_worker_spawns=round(float(skill.workerSpawns.mean()), 2),
        skill_judge_spawn_rate=round(float(skill.judgeSpawn.fillna(False).mean()), 3),
        skill_full_fanout_rate=round(float((skill.workerSpawns >= 9).mean()), 3),
        goal_mean_worker_spawns=round(float(scores[scores.variant == "goal"].workerSpawns.mean()), 2),
        winner_index_recovered=int(scores.winnerIndex.notna().sum()),
    )
    return out


# ---------------------------------------------------------------------------
# E3 — external state at breakdown sizes
# ---------------------------------------------------------------------------

def score_e3() -> pd.DataFrame:
    refs = {}
    for p in (PHASE / "programs" / "e3").glob("size*.trace.json"):
        refs[p.name.replace(".trace.json", "")] = json.loads(p.read_text())
    rows = []
    for r in load_records("e3"):
        v = r["variant"]
        key = f"size{v['statements']}-seed{v['seed']}"
        ref = refs[key]
        ref_assigns = [s for s in ref if s.get("action") == "assign"]
        ref_emits = [coerce(s.get("value")) for s in ref if s.get("action") == "emit"]
        arm = v["arm"]
        raw = r.get("rawOutput") or ""
        state_log = r.get("stateLog") or []
        if arm == "internal":
            trace = parse_fenced_trace(raw) or []
            emits = [coerce(s.get("value")) for s in trace if s.get("action") == "emit"]
            assign_acc = step_accuracy([s for s in trace if s.get("action") == "assign"], ref_assigns)
            produced = len(trace) > 0
        else:
            emits = [coerce(l) for l in (parse_fenced_lines(raw) or [])]
            sets = [dict(action="assign", var=c.get("name"), value=c.get("value"))
                    for c in state_log if c.get("tool") == "set"]
            assign_acc = step_accuracy(sets, ref_assigns) if arm == "chunked-store" else np.nan
            produced = len(emits) > 0
        emit_acc = lcs_len(emits, ref_emits) / len(ref_emits) if ref_emits else np.nan
        rows.append(dict(
            id=r["id"], arm=arm, size=v["statements"], seed=v["seed"],
            emit_acc=emit_acc, assign_acc=assign_acc,
            n_emits=len(emits), ref_emits=len(ref_emits), ref_assigns=len(ref_assigns),
            n_sets=sum(1 for c in state_log if c.get("tool") == "set"),
            n_gets=sum(1 for c in state_log if c.get("tool") == "get"),
            n_spawns=len(r.get("spawns") or []),
            produced_output=produced,
            emit_coverage=len(emits) / len(ref_emits) if ref_emits else np.nan,
            completion_tokens=int(r.get("completionTokens") or 0),
            duration_s=(int(r.get("durationMs") or 0)) / 1000,
            error=r.get("error"),
        ))
    return pd.DataFrame(rows)


# Phase-2 e3b context (sizes 100/200, same generator/arms; from the phase-2 report)
P2_E3B = {
    ("internal", 100): dict(emit=1.0), ("internal", 200): dict(emit=1.0),
    ("chunked-store", 100): dict(emit=1.0, assign=0.68),
    ("chunked-store", 200): dict(emit=0.82, assign=0.41),
    ("chunked-nostore", 100): dict(emit=0.94), ("chunked-nostore", 200): dict(emit=0.78),
}

E3_ARMS = ["internal", "chunked-store", "chunked-nostore"]
E3_COLORS = {"internal": C_C, "chunked-store": C_A, "chunked-nostore": C_B}


def chart_e3(df: pd.DataFrame):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    sizes = [100, 200, 400, 800]
    # emit accuracy with phase-2 context
    ax = axes[0]
    x = np.arange(len(sizes))
    w = 0.26
    for i, arm in enumerate(E3_ARMS):
        vals, hatches = [], []
        for s in sizes:
            if s in (100, 200):
                vals.append(P2_E3B[(arm, s)]["emit"])
                hatches.append("//")
            else:
                vals.append(float(df[(df.arm == arm) & (df["size"] == s)].emit_acc.mean()))
                hatches.append(None)
        bars = ax.bar(x + (i - 1) * w, vals, w, color=E3_COLORS[arm], label=arm)
        for b, h in zip(bars, hatches):
            if h:
                b.set_hatch(h)
                b.set_alpha(0.55)
    ax.set_xticks(x, [f"{s}\n(phase 2)" if s in (100, 200) else str(s) for s in sizes])
    ax.set_title("emit accuracy by size (hatched = phase-2 e3b context)")
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("program size (statements)")
    ax.legend(fontsize=8)
    # assign accuracy (store arms only)
    ax = axes[1]
    piv = df[df.arm.isin(["internal", "chunked-store"])].groupby(["size", "arm"]).assign_acc.mean().unstack()
    piv.plot.bar(ax=ax, color=[E3_COLORS[a] for a in piv.columns], rot=0)
    ax.set_title("assign accuracy (internal: reported trace; store: set log)")
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("program size (statements)")
    ax.legend(fontsize=8)
    fig.suptitle("E3: external state at breakdown sizes (haiku, n=6 per cell)", y=1.03)
    fig.tight_layout()
    fig.savefig(CHARTS / "e3-accuracy.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def summarise_e3(df: pd.DataFrame) -> dict:
    out = {"cells": {}, "phase2_context": {f"{a}|{s}": v for (a, s), v in P2_E3B.items()}}
    for (a, s), sub in df.groupby(["arm", "size"]):
        out["cells"][f"{a}|{s}"] = dict(
            emit_acc=round(float(sub.emit_acc.mean()), 3),
            assign_acc=None if sub.assign_acc.isna().all() else round(float(sub.assign_acc.mean()), 3),
            emit_coverage=round(float(sub.emit_coverage.mean()), 3),
            produced_output=int(sub.produced_output.sum()),
            sets=round(float(sub.n_sets.mean()), 1), gets=round(float(sub.n_gets.mean()), 1),
            tokens=int(sub.completion_tokens.mean()), wall_s=int(sub.duration_s.mean()),
            n=int(len(sub)),
        )
    return out


# ---------------------------------------------------------------------------

def main():
    CHARTS.mkdir(exist_ok=True)
    summary = {}

    e1 = score_e1()
    summary["e1"] = summarise_e1(e1)
    chart_e1(e1)
    chart_e1_cuts(e1)
    chart_e1_repeats(e1)
    e1.to_json(HERE / "e1-scored.json", orient="records")

    e2a = score_e2a()
    summary["e2a"] = summarise_e2a(e2a)
    chart_e2a(e2a)
    e2a.to_json(HERE / "e2a-scored.json", orient="records")

    e2b_scores, e2b_judge = score_e2b()
    summary["e2b"] = summarise_e2b(e2b_scores, e2b_judge)
    chart_e2b(e2b_scores, e2b_judge)
    e2b_scores.to_json(HERE / "e2b-scored.json", orient="records")
    e2b_judge.to_json(HERE / "e2b-judge-scored.json", orient="records")

    e3 = score_e3()
    summary["e3"] = summarise_e3(e3)
    chart_e3(e3)
    e3.to_json(HERE / "e3-scored.json", orient="records")

    (HERE / "summary.json").write_text(json.dumps(summary, indent=2, default=float))
    print(json.dumps(summary, indent=2, default=float))


if __name__ == "__main__":
    main()
