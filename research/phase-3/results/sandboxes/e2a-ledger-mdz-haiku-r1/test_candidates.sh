#!/bin/bash

# Save original
cp ledger.ts ledger.ts.original

ORIGINAL="/private/var/folders/t8/bhx1lqx977df536xx99b4f480000gp/T/mdz-agentic-4MjbyJ/ledger.ts.original"

candidates=(
  "reduce-complexity"
  "cache-work"
  "data-structures"
  "batch-io"
  "hoist-invariant"
)

declare -A results

for strategy in "${candidates[@]}"; do
  echo "Testing strategy: $strategy"
  
  # Copy candidate to ledger.ts
  cp "candidates/$strategy/ledger.ts" ledger.ts
  
  # Run tests
  if ! node ledger.test.ts > /dev/null 2>&1; then
    echo "  ❌ FAILED tests"
    results[$strategy]="FAILED_TESTS"
    continue
  fi
  
  # Run benchmark and capture BENCH_MS
  output=$(node bench.ts 2>&1)
  bench_ms=$(echo "$output" | grep "BENCH_MS:" | awk '{print $2}')
  
  if [ -z "$bench_ms" ]; then
    echo "  ❌ FAILED to get benchmark"
    results[$strategy]="FAILED_BENCH"
  else
    echo "  ✓ BENCH_MS: $bench_ms"
    results[$strategy]="$bench_ms"
  fi
done

echo ""
echo "=== RESULTS ==="
for strategy in "${candidates[@]}"; do
  echo "$strategy: ${results[$strategy]}"
done

