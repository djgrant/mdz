#!/bin/bash

# Test all candidates and record benchmark times

candidates=(
  "reduce-complexity"
  "cache-memoization"
  "better-data-structures"
  "batch-io"
  "hoist-loop-invariant"
)

declare -A results

for strategy in "${candidates[@]}"; do
  echo "Testing $strategy..."
  
  # Copy candidate to logscan.py
  cp "candidates/$strategy/logscan.py" logscan.py
  
  # Run tests
  if ! python3 test_logscan.py > /dev/null 2>&1; then
    echo "  ❌ Tests failed"
    results[$strategy]="FAILED"
    continue
  fi
  
  # Run benchmark
  output=$(python3 bench.py 2>&1)
  bench_ms=$(echo "$output" | grep "BENCH_MS:" | awk '{print $2}')
  
  if [ -z "$bench_ms" ]; then
    echo "  ❌ Benchmark failed"
    results[$strategy]="FAILED"
  else
    echo "  ✓ BENCH_MS: $bench_ms"
    results[$strategy]=$bench_ms
  fi
done

echo ""
echo "=== RESULTS ==="
fastest_strategy=""
fastest_time=999999

for strategy in "${candidates[@]}"; do
  result=${results[$strategy]}
  if [ "$result" != "FAILED" ]; then
    echo "$strategy: $result ms"
    if (( $(echo "$result < $fastest_time" | bc -l) )); then
      fastest_time=$result
      fastest_strategy=$strategy
    fi
  else
    echo "$strategy: FAILED"
  fi
done

echo ""
if [ -n "$fastest_strategy" ]; then
  echo "Fastest: $fastest_strategy with $fastest_time ms"
  cp "candidates/$fastest_strategy/logscan.py" logscan.py
else
  echo "No candidates passed tests, restoring original"
  cp logscan.py.original logscan.py
fi
