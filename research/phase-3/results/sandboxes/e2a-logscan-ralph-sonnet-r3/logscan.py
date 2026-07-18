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
    n_methods = len(METHODS)
    n_statuses = len(STATUSES)
    lines = []
    append = lines.append
    methods = METHODS
    statuses = STATUSES
    for _ in range(cfg["lines"]):
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        a = int(state / 4294967296 * 250)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        b = 1 + int(state / 4294967296 * hosts_mod)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        hour = int(state / 4294967296 * hours)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        method = methods[int(state / 4294967296 * n_methods)]
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        path = "/api/v1/resource-%d" % int(state / 4294967296 * paths)
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        status = statuses[int(state / 4294967296 * n_statuses)]
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        size = int(state / 4294967296 * 60000)
        append("10.0.%d.%d [%02d:00] %s %s %d %d\n" % (a, b, hour, method, path, status, size))
    with open(log_path, "w") as f:
        f.write("".join(lines))


def make_suspicious(cfg):
    rnd = lcg(cfg["seed"] + 29)
    return ["10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * 250)) for _ in range(cfg["suspicious"])]


def load_lines(log_path):
    """Read the log back, assembling lines by hand."""
    with open(log_path, "rb") as f:
        data = f.read()
    if data.endswith(b"\n"):
        data = data[:-1]
    if not data:
        return []
    return data.decode().split("\n")


_status_class_cache = {}


def status_class(status):
    """Classify a status code. Pure, but re-derives its banding every call."""
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


_method_weight_cache = {}


def method_weight(method, seed):
    """Weight table for methods; depends only on the seed, never on the entry."""
    table = _method_weight_cache.get(seed)
    if table is None:
        table = {}
        for m in METHODS:
            w = seed
            for _ in range(200):
                w = (w * 13 + len(m)) % 999983
            table[m] = w % 17
        _method_weight_cache[seed] = table
    return table[method]


def top_path_per_hour(entries, hours):
    """For every hour, the most requested path (ties to the lexically smaller)."""
    counts_by_hour = [{} for _ in range(hours)]
    for e in entries:
        hour = e["hour"]
        if 0 <= hour < hours:
            counts = counts_by_hour[hour]
            p = e["path"]
            counts[p] = counts.get(p, 0) + 1

    return _tops_from_counts(counts_by_hour, hours)


def _tops_from_counts(counts_by_hour, hours):
    tops = []
    for hour in range(hours):
        best = None
        best_count = -1
        for p, c in counts_by_hour[hour].items():
            if c > best_count or (c == best_count and p < best):
                best, best_count = p, c
        tops.append((hour, best, best_count))
    return tops


def parse_line(line):
    host, bracketed, method, path, status, size = line.split(" ")
    return (host, int(bracketed[1:3]), method, path, int(status), int(size))


def analyse(cfg, log_path, report_path):
    write_log(cfg, log_path)
    lines = load_lines(log_path)
    suspicious = set(make_suspicious(cfg))

    hours = cfg["hours"]
    counts_by_hour = [{} for _ in range(hours)]
    class_counts = {}
    weighted = 0
    flagged = 0
    total_bytes = 0
    seed = cfg["seed"]

    class_of = {s: status_class(s) for s in STATUSES}
    weight_of = {m: method_weight(m, seed) for m in METHODS}

    for line in lines:
        host, bracketed, method, path, status_s, size_s = line.split(" ")
        hour = int(bracketed[1:3])
        status = int(status_s)
        size = int(size_s)
        cls = class_of[status]
        class_counts[cls] = class_counts.get(cls, 0) + 1
        weighted += weight_of[method]
        if host in suspicious:
            flagged += 1
        total_bytes += size
        if 0 <= hour < hours:
            counts = counts_by_hour[hour]
            counts[path] = counts.get(path, 0) + 1

    tops = _tops_from_counts(counts_by_hour, hours)

    if os.path.exists(report_path):
        os.remove(report_path)
    lines_written = 0
    out = []
    for hour, path, count in tops:
        out.append("HOUR %02d top=%s hits=%d\n" % (hour, path, count))
        lines_written += 1
    for cls in sorted(class_counts):
        out.append("CLASS %s count=%d\n" % (cls, class_counts[cls]))
        lines_written += 1
    out.append("SUMMARY flagged=%d weighted=%d bytes=%d\n" % (flagged, weighted, total_bytes))
    lines_written += 1

    text = "".join(out)
    with open(report_path, "w") as f:
        f.write(text)

    digest = 2166136261
    for ch in text:
        digest = ((digest ^ ord(ch)) * 16777619) & 0xFFFFFFFF

    return {
        "entries": len(lines),
        "flagged": flagged,
        "weighted": weighted,
        "total_bytes": total_bytes,
        "lines_written": lines_written,
        "checksum": digest,
    }
