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
        f.writelines(lines)


def make_suspicious(cfg):
    rnd = lcg(cfg["seed"] + 29)
    return ["10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * 250)) for _ in range(cfg["suspicious"])]


def load_lines(log_path):
    """Read the log back one byte per read call, assembling lines by hand."""
    with open(log_path) as f:
        return f.read().splitlines()


_status_class_cache = {}
def status_class(status):
    """Classify a status code. Pure, but re-derives its banding every call."""
    if status not in _status_class_cache:
        h = status
        for i in range(2000):
            h = (h * 31 + i) % 1000003
        band = "2xx" if status < 300 else "3xx" if status < 400 else "4xx" if status < 500 else "5xx"
        _status_class_cache[status] = "%s-%d" % (band, h % 89)
    return _status_class_cache[status]


def _precompute_status_classes(statuses):
    """Pre-compute all status classes for given status codes."""
    result = {}
    for status in set(statuses):
        result[status] = status_class(status)
    return result


_method_weight_cache = {}
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
    hour_paths = [{} for _ in range(hours)]
    for e in entries:
        hour = e["hour"]
        path = e["path"]
        hour_paths[hour][path] = hour_paths[hour].get(path, 0) + 1

    tops = []
    for hour in range(hours):
        paths_dict = hour_paths[hour]
        if not paths_dict:
            tops.append((hour, None, -1))
        else:
            best = min(paths_dict.keys(), key=lambda p: (-paths_dict[p], p))
            tops.append((hour, best, paths_dict[best]))
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
    lines = load_lines(log_path)
    suspicious = set(make_suspicious(cfg))

    # Pre-compute status classes and method weights to avoid repeated expensive hashing
    status_dict = _precompute_status_classes(STATUSES)
    status_cache = [None] * 600
    for status, cls in status_dict.items():
        status_cache[status] = cls
    method_cache = {}
    for m in METHODS:
        method_cache[m] = method_weight(m, cfg["seed"])

    class_counts = defaultdict(int)
    weighted = 0
    flagged = 0
    total_bytes = 0
    entries_count = 0
    hour_paths = [defaultdict(int) for _ in range(cfg["hours"])]
    hour_tops = [(None, -1)] * cfg["hours"]  # (best_path, best_count) for each hour

    for line in lines:
        host, bracketed, method, path, status, size = line.split(" ")
        hour = int(bracketed[1:3])
        status_int = int(status)
        size_int = int(size)
        entries_count += 1

        class_counts[status_cache[status_int]] += 1
        weighted += method_cache[method]
        if host in suspicious:
            flagged += 1
        total_bytes += size_int

        hp = hour_paths[hour]
        hp[path] += 1
        new_count = hp[path]

        # Update top path for this hour
        best_path, best_count = hour_tops[hour]
        if new_count > best_count or (new_count == best_count and (best_path is None or path < best_path)):
            hour_tops[hour] = (path, new_count)

    # Build report lines directly from hour_tops
    if os.path.exists(report_path):
        os.remove(report_path)

    report_lines = []
    for hour, (path, count) in enumerate(hour_tops):
        report_lines.append(f"HOUR {hour:02d} top={path} hits={count}\n")
    sorted_classes = sorted(class_counts)
    for cls in sorted_classes:
        report_lines.append(f"CLASS {cls} count={class_counts[cls]}\n")
    report_lines.append(f"SUMMARY flagged={flagged} weighted={weighted} bytes={total_bytes}\n")

    # Compute checksum while writing to avoid a second file read
    digest = 2166136261
    with open(report_path, "w") as f:
        for line in report_lines:
            f.write(line)
            for char in line:
                digest = ((digest ^ ord(char)) * 16777619) & 0xFFFFFFFF
    lines_written = len(report_lines)

    return {
        "entries": entries_count,
        "flagged": flagged,
        "weighted": weighted,
        "total_bytes": total_bytes,
        "lines_written": lines_written,
        "checksum": digest,
    }
