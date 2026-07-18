"""Log analyser: parses a synthetic access log and writes a traffic report.

Correct but slow; the test suite pins the observable behaviour and bench.py
drives it. Standard library only.
"""

import os
from functools import lru_cache

BENCH_CONFIG = {"lines": 16000, "hosts": 900, "paths": 60, "hours": 12, "suspicious": 2500, "seed": 4021}
TEST_CONFIG = {"lines": 700, "hosts": 80, "paths": 12, "hours": 12, "suspicious": 120, "seed": 11}

METHODS = ["GET", "GET", "GET", "POST", "PUT", "DELETE"]
STATUSES = [200, 200, 200, 201, 204, 301, 404, 404, 500, 503]


def lcg(seed):
    state = seed & 0xFFFFFFFF

    def rnd():
        nonlocal state
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        return state / 4294967296

    return rnd


def write_log(cfg, log_path):
    """Generate the deterministic access log for a config."""
    state = cfg["seed"] & 0xFFFFFFFF
    hosts_mod = cfg["hosts"] % 250
    n_methods = len(METHODS)
    n_statuses = len(STATUSES)
    paths = cfg["paths"]
    hours = cfg["hours"]
    lines = []
    append = lines.append
    for _ in range(cfg["lines"]):
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        a = int(state / 4294967296 * 250)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        b = 1 + int(state / 4294967296 * hosts_mod)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        hour = int(state / 4294967296 * hours)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        method = METHODS[int(state / 4294967296 * n_methods)]
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        path_n = int(state / 4294967296 * paths)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        status = STATUSES[int(state / 4294967296 * n_statuses)]
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        size = int(state / 4294967296 * 60000)
        append("10.0.%d.%d [%02d:00] %s /api/v1/resource-%d %d %d\n" % (a, b, hour, method, path_n, status, size))
    with open(log_path, "w") as f:
        f.write("".join(lines))


def make_suspicious(cfg):
    rnd = lcg(cfg["seed"] + 29)
    return ["10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * 250)) for _ in range(cfg["suspicious"])]


def load_lines(log_path):
    """Read the log back in one buffered read, splitting into lines by hand."""
    with open(log_path, "rb") as f:
        data = f.read()
    parts = data.split(b"\n")
    if parts and parts[-1] == b"":
        parts.pop()
    return [p.decode() for p in parts]


@lru_cache(maxsize=None)
def status_class(status):
    """Classify a status code. Pure, but re-derives its banding every call."""
    h = status
    for i in range(2000):
        h = (h * 31 + i) % 1000003
    band = "2xx" if status < 300 else "3xx" if status < 400 else "4xx" if status < 500 else "5xx"
    return "%s-%d" % (band, h % 89)


@lru_cache(maxsize=None)
def _method_weight_table(seed):
    table = {}
    for m in METHODS:
        w = seed
        for _ in range(200):
            w = (w * 13 + len(m)) % 999983
        table[m] = w % 17
    return table


def method_weight(method, seed):
    """Weight table for methods; depends only on the seed, never on the entry."""
    return _method_weight_table(seed)[method]


def top_path_per_hour(entries, hours):
    """For every hour, the most requested path (ties to the lexically smaller)."""
    by_hour = [[] for _ in range(hours)]
    for e in entries:
        by_hour[e["hour"]].append(e["path"])

    tops = []
    for hour in range(hours):
        counts = {}
        for p in by_hour[hour]:
            counts[p] = counts.get(p, 0) + 1
        best = None
        best_count = -1
        for p, c in counts.items():
            if c > best_count or (c == best_count and p < best):
                best, best_count = p, c
        tops.append((hour, best, best_count))
    return tops


def parse_line(line):
    host, bracketed, method, path, status, size = line.split(" ", 5)
    return {
        "host": host,
        "hour": int(bracketed[1:3]),
        "method": method,
        "path": path,
        "status": int(status),
        "size": int(size),
    }


def analyse(cfg, log_path, report_path):
    write_log(cfg, log_path)
    entries = [parse_line(line) for line in load_lines(log_path)]
    suspicious = set(make_suspicious(cfg))

    class_counts = {}
    weighted = 0
    flagged = 0
    total_bytes = 0
    for e in entries:
        cls = status_class(e["status"])
        class_counts[cls] = class_counts.get(cls, 0) + 1
        weighted += method_weight(e["method"], cfg["seed"])
        if e["host"] in suspicious:
            flagged += 1
        total_bytes += e["size"]

    tops = top_path_per_hour(entries, cfg["hours"])

    lines_written = 0
    report_lines = []
    for hour, path, count in tops:
        report_lines.append("HOUR %02d top=%s hits=%d\n" % (hour, path, count))
        lines_written += 1
    for cls in sorted(class_counts):
        report_lines.append("CLASS %s count=%d\n" % (cls, class_counts[cls]))
        lines_written += 1
    report_lines.append("SUMMARY flagged=%d weighted=%d bytes=%d\n" % (flagged, weighted, total_bytes))
    lines_written += 1

    text = "".join(report_lines)
    with open(report_path, "w") as f:
        f.write(text)
    digest = 2166136261
    for ch in text:
        digest = ((digest ^ ord(ch)) * 16777619) & 0xFFFFFFFF

    return {
        "entries": len(entries),
        "flagged": flagged,
        "weighted": weighted,
        "total_bytes": total_bytes,
        "lines_written": lines_written,
        "checksum": digest,
    }
