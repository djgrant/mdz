"""Log analyser: parses a synthetic access log and writes a traffic report.

Correct but slow; the test suite pins the observable behaviour and bench.py
drives it. Standard library only.
"""

import os
from collections import defaultdict

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
    rnd = lcg(cfg["seed"])
    methods_len = len(METHODS)
    statuses_len = len(STATUSES)
    hosts_mod = cfg["hosts"] % 250
    hours = cfg["hours"]
    paths = cfg["paths"]
    with open(log_path, "w") as f:
        for _ in range(cfg["lines"]):
            host = "10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * hosts_mod))
            hour = int(rnd() * hours)
            method = METHODS[int(rnd() * methods_len)]
            path = "/api/v1/resource-%d" % int(rnd() * paths)
            status = STATUSES[int(rnd() * statuses_len)]
            size = int(rnd() * 60000)
            f.write("%s [%02d:00] %s %s %d %d\n" % (host, hour, method, path, status, size))


def make_suspicious(cfg):
    rnd = lcg(cfg["seed"] + 29)
    return ["10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * 250)) for _ in range(cfg["suspicious"])]


def load_lines(log_path):
    """Read the log back one byte per read call, assembling lines by hand."""
    with open(log_path, "r") as f:
        return f.read().splitlines()


_status_class_cache = {}

def _precompute_status_classes():
    """Pre-compute status classes for all statuses we'll encounter."""
    global _status_class_cache
    for status in STATUSES:
        if status not in _status_class_cache:
            h = status
            for i in range(2000):
                h = (h * 31 + i) % 1000003
            band = "2xx" if status < 300 else "3xx" if status < 400 else "4xx" if status < 500 else "5xx"
            _status_class_cache[status] = "%s-%d" % (band, h % 89)

def status_class(status):
    """Classify a status code. Pure, but re-derives its banding every call."""
    if status not in _status_class_cache:
        h = status
        for i in range(2000):
            h = (h * 31 + i) % 1000003
        band = "2xx" if status < 300 else "3xx" if status < 400 else "4xx" if status < 500 else "5xx"
        _status_class_cache[status] = "%s-%d" % (band, h % 89)
    return _status_class_cache[status]


_method_weight_cache = {}

def _precompute_method_weights(seed):
    """Pre-compute method weights for a given seed."""
    if seed not in _method_weight_cache:
        table = {}
        for m in METHODS:
            w = seed
            for _ in range(200):
                w = (w * 13 + len(m)) % 999983
            table[m] = w % 17
        _method_weight_cache[seed] = table

def method_weight(method, seed):
    """Weight table for methods; depends only on the seed, never on the entry."""
    if seed not in _method_weight_cache:
        table = {}
        for m in METHODS:
            w = seed
            for _ in range(200):
                w = (w * 13 + len(m)) % 999983
            table[m] = w % 17
        _method_weight_cache[seed] = table
    return _method_weight_cache[seed][method]


def top_path_per_hour(entries, hours):
    """For every hour, the most requested path (ties to the lexically smaller)."""
    hour_paths = {}
    for e in entries:
        hour = e["hour"]
        path = e["path"]
        if hour not in hour_paths:
            hour_paths[hour] = {}
        pd = hour_paths[hour]
        pd[path] = pd.get(path, 0) + 1

    tops = []
    for hour in range(hours):
        best = None
        best_count = -1
        if hour in hour_paths:
            for path, count in hour_paths[hour].items():
                if count > best_count or (count == best_count and path < best):
                    best, best_count = path, count
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
    _precompute_status_classes()
    _precompute_method_weights(cfg["seed"])

    write_log(cfg, log_path)
    entries = [parse_line(line) for line in load_lines(log_path)]
    suspicious = set(make_suspicious(cfg))

    status_map = _status_class_cache
    method_map = _method_weight_cache[cfg["seed"]]

    class_counts = defaultdict(int)
    weighted = 0
    flagged = 0
    total_bytes = 0
    for e in entries:
        status = e["status"]
        method = e["method"]
        host = e["host"]
        size = e["size"]
        cls = status_map[status]
        class_counts[cls] += 1
        weighted += method_map[method]
        if host in suspicious:
            flagged += 1
        total_bytes += size

    tops = top_path_per_hour(entries, cfg["hours"])

    if os.path.exists(report_path):
        os.remove(report_path)

    report_lines = []
    for hour, path, count in tops:
        report_lines.append("HOUR %02d top=%s hits=%d\n" % (hour, path, count))
    for cls in sorted(class_counts):
        report_lines.append("CLASS %s count=%d\n" % (cls, class_counts[cls]))
    report_lines.append("SUMMARY flagged=%d weighted=%d bytes=%d\n" % (flagged, weighted, total_bytes))

    report_text = "".join(report_lines)

    with open(report_path, "w") as f:
        f.write(report_text)

    digest = 2166136261
    for ch in report_text:
        digest = ((digest ^ ord(ch)) * 16777619) & 0xFFFFFFFF

    return {
        "entries": len(entries),
        "flagged": flagged,
        "weighted": weighted,
        "total_bytes": total_bytes,
        "lines_written": len(report_lines),
        "checksum": digest,
    }
