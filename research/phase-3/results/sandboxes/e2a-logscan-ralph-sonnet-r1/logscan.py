"""Log analyser: parses a synthetic access log and writes a traffic report.

Correct but slow; the test suite pins the observable behaviour and bench.py
drives it. Standard library only.
"""

import os

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
    hours = cfg["hours"]
    paths = cfg["paths"]
    methods = METHODS
    statuses = STATUSES
    n_methods = len(methods)
    n_statuses = len(statuses)
    out = []
    append = out.append
    for _ in range(cfg["lines"]):
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        r1 = state / 4294967296
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        r2 = state / 4294967296
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        r3 = state / 4294967296
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        r4 = state / 4294967296
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        r5 = state / 4294967296
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        r6 = state / 4294967296
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        r7 = state / 4294967296

        host = "10.0.%d.%d" % (int(r1 * 250), 1 + int(r2 * hosts_mod))
        hour = int(r3 * hours)
        method = methods[int(r4 * n_methods)]
        path = "/api/v1/resource-%d" % int(r5 * paths)
        status = statuses[int(r6 * n_statuses)]
        size = int(r7 * 60000)
        append("%s [%02d:00] %s %s %d %d\n" % (host, hour, method, path, status, size))
    with open(log_path, "w") as f:
        f.write("".join(out))


def make_suspicious(cfg):
    rnd = lcg(cfg["seed"] + 29)
    return ["10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * 250)) for _ in range(cfg["suspicious"])]


def load_lines(log_path):
    """Read the log back and assemble lines."""
    with open(log_path, "rb") as f:
        data = f.read()
    if data.endswith(b"\n"):
        data = data[:-1]
    if not data:
        return []
    return [chunk.decode() for chunk in data.split(b"\n")]


_status_class_cache = {}


def status_class(status):
    """Classify a status code. Pure, so memoise its banding."""
    cached = _status_class_cache.get(status)
    if cached is not None:
        return cached
    h = status
    for i in range(2000):
        h = (h * 31 + i) % 1000003
    band = "2xx" if status < 300 else "3xx" if status < 400 else "4xx" if status < 500 else "5xx"
    result = "%s-%d" % (band, h % 89)
    _status_class_cache[status] = result
    return result


_method_weight_table_cache = {}


def method_weight(method, seed):
    """Weight table for methods; depends only on the seed, never on the entry."""
    table = _method_weight_table_cache.get(seed)
    if table is None:
        table = {}
        for m in METHODS:
            w = seed
            for _ in range(200):
                w = (w * 13 + len(m)) % 999983
            table[m] = w % 17
        _method_weight_table_cache[seed] = table
    return table[method]


def top_path_per_hour(entries, hours):
    """For every hour, the most requested path (ties to the lexically smaller)."""
    counts_per_hour = [{} for _ in range(hours)]
    for e in entries:
        hour = e["hour"]
        if 0 <= hour < hours:
            counts = counts_per_hour[hour]
            p = e["path"]
            counts[p] = counts.get(p, 0) + 1

    tops = []
    for hour in range(hours):
        best = None
        best_count = -1
        for p, c in counts_per_hour[hour].items():
            if c > best_count or (c == best_count and p < best):
                best, best_count = p, c
        tops.append((hour, best, best_count))
    return tops


def parse_line(line):
    host, bracketed, method, path, status, size = line.split(" ")
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

    seed = cfg["seed"]
    sc_cache = _status_class_cache
    for e in entries:
        status = e["status"]
        if status not in sc_cache:
            status_class(status)
    method_weight(METHODS[0], seed)
    mw_table = _method_weight_table_cache[seed]

    class_counts = {}
    cc_get = class_counts.get
    susp_contains = suspicious.__contains__
    weighted = 0
    flagged = 0
    total_bytes = 0
    for e in entries:
        cls = sc_cache[e["status"]]
        class_counts[cls] = cc_get(cls, 0) + 1
        weighted += mw_table[e["method"]]
        if susp_contains(e["host"]):
            flagged += 1
        total_bytes += e["size"]

    tops = top_path_per_hour(entries, cfg["hours"])

    report_lines = []
    for hour, path, count in tops:
        report_lines.append("HOUR %02d top=%s hits=%d\n" % (hour, path, count))
    for cls in sorted(class_counts):
        report_lines.append("CLASS %s count=%d\n" % (cls, class_counts[cls]))
    report_lines.append("SUMMARY flagged=%d weighted=%d bytes=%d\n" % (flagged, weighted, total_bytes))
    lines_written = len(report_lines)

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
