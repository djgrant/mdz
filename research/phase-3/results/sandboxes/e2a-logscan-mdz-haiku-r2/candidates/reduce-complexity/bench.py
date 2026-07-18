"""Benchmark: run the full analysis on the bench workload and print one
machine-parseable line. The scorer trusts only this output."""

import time

from logscan import BENCH_CONFIG, analyse

t0 = time.time()
summary = analyse(BENCH_CONFIG, "access.log", "report.out")
ms = (time.time() - t0) * 1000

print("CHECKSUM: %d" % summary["checksum"])
print("BENCH_MS: %d" % round(ms))
