import subprocess
import shutil
import os

candidates = [
    ("strategy1_algorithmic.py", "Reduce algorithmic complexity"),
    ("strategy2_memoize.py", "Cache repeated work"),
    ("strategy3_datastructure.py", "Pick better data structures"),
    ("strategy4_batchio.py", "Batch the I/O"),
    ("strategy5_hoist.py", "Hoist loop-invariant work"),
]

results = []

for filename, strategy_name in candidates:
    print(f"\n{'='*60}")
    print(f"Testing: {strategy_name}")
    print(f"{'='*60}")
    
    candidate_path = f"candidates/{filename}"
    
    # Copy candidate to logscan.py
    shutil.copy(candidate_path, "logscan.py")
    
    # Run tests
    test_result = subprocess.run(["python3", "test_logscan.py"], capture_output=True, text=True)
    if test_result.returncode != 0:
        print("TESTS FAILED:")
        print(test_result.stdout)
        print(test_result.stderr)
        results.append((strategy_name, "FAILED", 0))
        continue
    
    print("Tests: PASSED")
    
    # Run benchmark
    bench_result = subprocess.run(["python3", "bench.py"], capture_output=True, text=True)
    print(bench_result.stdout)
    
    # Extract BENCH_MS
    for line in bench_result.stdout.split('\n'):
        if line.startswith("BENCH_MS:"):
            ms = int(line.split(":")[1].strip())
            results.append((strategy_name, "PASSED", ms))
            print(f"Result: {ms} ms")

print(f"\n{'='*60}")
print("SUMMARY")
print(f"{'='*60}")

for strategy, status, ms in results:
    if status == "PASSED":
        print(f"{strategy:40} {ms:6d} ms")
    else:
        print(f"{strategy:40} {status}")

if any(status == "PASSED" for _, status, _ in results):
    best = min((r for r in results if r[1] == "PASSED"), key=lambda x: x[2])
    print(f"\nBest strategy: {best[0]} with {best[2]} ms")
