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
    lines = []
    for _ in range(cfg["lines"]):
        host = "10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * (cfg["hosts"] % 250)))
        hour = int(rnd() * cfg["hours"])
        method = METHODS[int(rnd() * len(METHODS))]
        path = "/api/v1/resource-%d" % int(rnd() * cfg["paths"])
        status = STATUSES[int(rnd() * len(STATUSES))]
        size = int(rnd() * 60000)
        lines.append("%s [%02d:00] %s %s %d %d\n" % (host, hour, method, path, status, size))

    with open(log_path, "w") as f:
        f.write("".join(lines))


def make_suspicious(cfg):
    rnd = lcg(cfg["seed"] + 29)
    return ["10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * 250)) for _ in range(cfg["suspicious"])]


def load_lines(log_path):
    """Read the log back one byte per read call, assembling lines by hand."""
    with open(log_path, "r") as f:
        return f.read().splitlines()


_status_class_cache = {}

def status_class(status):
    """Classify a status code. Pure, but re-derives its banding every call."""
    if status in _status_class_cache:
        return _status_class_cache[status]
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
    key = (method, seed)
    if key in _method_weight_cache:
        return _method_weight_cache[key]
    w = seed
    for _ in range(200):
        w = (w * 13 + len(method)) % 999983
    result = w % 17
    _method_weight_cache[key] = result
    return result


def top_path_per_hour(entries, hours):
    """For every hour, the most requested path (ties to the lexically smaller)."""
    hour_paths = defaultdict(lambda: defaultdict(int))
    for e in entries:
        hour_paths[e["hour"]][e["path"]] += 1

    tops = []
    for hour in range(hours):
        if hour not in hour_paths:
            tops.append((hour, None, -1))
        else:
            paths_count = hour_paths[hour]
            if paths_count:
                best, best_count = min(paths_count.items(), key=lambda x: (-x[1], x[0]))
            else:
                best, best_count = None, -1
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
    suspicious_set = set(make_suspicious(cfg))

    # Pre-compute status_class and method_weight for all possible values
    status_lookup = {}
    for status in STATUSES:
        status_lookup[status] = status_class(status)

    method_lookup = {}
    for method in METHODS:
        if method not in method_lookup:
            method_lookup[method] = method_weight(method, cfg["seed"])

    class_counts = defaultdict(int)
    weighted = 0
    flagged = 0
    total_bytes = 0
    hour_paths = defaultdict(lambda: defaultdict(int))

    for e in entries:
        class_counts[status_lookup[e["status"]]] += 1
        weighted += method_lookup[e["method"]]
        if e["host"] in suspicious_set:
            flagged += 1
        total_bytes += e["size"]
        hour_paths[e["hour"]][e["path"]] += 1

    tops = []
    for hour in range(cfg["hours"]):
        if hour not in hour_paths:
            tops.append((hour, None, -1))
        else:
            paths_count = hour_paths[hour]
            if paths_count:
                best, best_count = min(paths_count.items(), key=lambda x: (-x[1], x[0]))
            else:
                best, best_count = None, -1
            tops.append((hour, best, best_count))

    digest = 2166136261
    lines_written = 0

    with open(report_path, "w") as f:
        for hour, path, count in tops:
            line = "HOUR %02d top=%s hits=%d\n" % (hour, path, count)
            f.write(line)
            for ch in line:
                digest = ((digest ^ ord(ch)) * 16777619) & 0xFFFFFFFF
            lines_written += 1
        for cls in sorted(class_counts):
            line = "CLASS %s count=%d\n" % (cls, class_counts[cls])
            f.write(line)
            for ch in line:
                digest = ((digest ^ ord(ch)) * 16777619) & 0xFFFFFFFF
            lines_written += 1
        line = "SUMMARY flagged=%d weighted=%d bytes=%d\n" % (flagged, weighted, total_bytes)
        f.write(line)
        for ch in line:
            digest = ((digest ^ ord(ch)) * 16777619) & 0xFFFFFFFF
        lines_written += 1

    return {
        "entries": len(entries),
        "flagged": flagged,
        "weighted": weighted,
        "total_bytes": total_bytes,
        "lines_written": lines_written,
        "checksum": digest,
    }
