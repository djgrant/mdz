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
    rnd = lcg(cfg["seed"])
    with open(log_path, "w") as f:
        for _ in range(cfg["lines"]):
            host = "10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * (cfg["hosts"] % 250)))
            hour = int(rnd() * cfg["hours"])
            method = METHODS[int(rnd() * len(METHODS))]
            path = "/api/v1/resource-%d" % int(rnd() * cfg["paths"])
            status = STATUSES[int(rnd() * len(STATUSES))]
            size = int(rnd() * 60000)
            f.write("%s [%02d:00] %s %s %d %d\n" % (host, hour, method, path, status, size))


def make_suspicious(cfg):
    rnd = lcg(cfg["seed"] + 29)
    return ["10.0.%d.%d" % (int(rnd() * 250), 1 + int(rnd() * 250)) for _ in range(cfg["suspicious"])]


def load_lines(log_path):
    """Read the log back one byte per read call, assembling lines by hand."""
    lines = []
    fd = os.open(log_path, os.O_RDONLY)
    current = []
    while True:
        ch = os.read(fd, 1)
        if ch == b"":
            break
        if ch == b"\n":
            lines.append(b"".join(current).decode())
            current = []
        else:
            current.append(ch)
    os.close(fd)
    return lines


def status_class(status):
    """Classify a status code. Pure, but re-derives its banding every call."""
    h = status
    for i in range(2000):
        h = (h * 31 + i) % 1000003
    band = "2xx" if status < 300 else "3xx" if status < 400 else "4xx" if status < 500 else "5xx"
    return "%s-%d" % (band, h % 89)


def method_weight(method, seed):
    """Weight table for methods; depends only on the seed, never on the entry."""
    table = {}
    for m in METHODS:
        w = seed
        for _ in range(200):
            w = (w * 13 + len(m)) % 999983
        table[m] = w % 17
    return table[method]


def top_path_per_hour(entries, hours):
    """For every hour, the most requested path (ties to the lexically smaller)."""
    # Single pass: build lookup table of path counts per hour
    hour_paths = {}
    for e in entries:
        hour = e["hour"]
        path = e["path"]
        if hour not in hour_paths:
            hour_paths[hour] = {}
        hour_paths[hour][path] = hour_paths[hour].get(path, 0) + 1

    # Extract the top path for each hour
    tops = []
    for hour in range(hours):
        if hour in hour_paths:
            best = None
            best_count = -1
            for p, c in hour_paths[hour].items():
                if c > best_count or (c == best_count and p < best):
                    best, best_count = p, c
            tops.append((hour, best, best_count))
        else:
            tops.append((hour, None, -1))
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
    suspicious = make_suspicious(cfg)

    # Build method weight table once instead of rebuilding for each entry
    method_weights = {}
    for m in METHODS:
        w = cfg["seed"]
        for _ in range(200):
            w = (w * 13 + len(m)) % 999983
        method_weights[m] = w % 17

    class_counts = {}
    weighted = 0
    flagged = 0
    total_bytes = 0
    status_cache = {}

    for e in entries:
        # Cache status class lookups to avoid redundant computation
        status = e["status"]
        if status not in status_cache:
            status_cache[status] = status_class(status)
        cls = status_cache[status]

        class_counts[cls] = class_counts.get(cls, 0) + 1
        weighted += method_weights[e["method"]]
        if e["host"] in suspicious:
            flagged += 1
        total_bytes += e["size"]

    tops = top_path_per_hour(entries, cfg["hours"])

    if os.path.exists(report_path):
        os.remove(report_path)
    lines_written = 0
    for hour, path, count in tops:
        with open(report_path, "a") as f:
            f.write("HOUR %02d top=%s hits=%d\n" % (hour, path, count))
        lines_written += 1
    for cls in sorted(class_counts):
        with open(report_path, "a") as f:
            f.write("CLASS %s count=%d\n" % (cls, class_counts[cls]))
        lines_written += 1
    with open(report_path, "a") as f:
        f.write("SUMMARY flagged=%d weighted=%d bytes=%d\n" % (flagged, weighted, total_bytes))
    lines_written += 1

    with open(report_path) as f:
        text = f.read()
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
