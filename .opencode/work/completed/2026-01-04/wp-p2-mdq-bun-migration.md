---
size: sm
category: tooling
---

# mdq Bun Migration & Extended Performance Testing

## Goal/Problem

Migrate mdq from a Node.js script in `tools/mdq/` to a proper workspace package using Bun, and run extended performance tests at 10k/100k/1M scale.

## Scope

- `packages/mdq/` (new workspace package)
- `pnpm-workspace.yaml` (updated)
- `tools/mdq/mdq` (deprecated, to be removed)

## Changes Made

### 1. Package Structure

Created proper workspace package at `packages/mdq/`:

```
packages/mdq/
├── package.json        # @mdz/mdq package
├── src/
│   └── mdq.ts         # Bun-native implementation
└── tests/
    └── performance.test.ts  # Performance test harness
```

### 2. Workspace Configuration

Updated `pnpm-workspace.yaml` to include packages:

```yaml
packages:
  - "."
  - "website"
  - "packages/*"
```

### 3. Bun Conversion

Key changes from Node.js to Bun:

- Shebang: `#!/usr/bin/env node` → `#!/usr/bin/env bun`
- Module system: CommonJS (`require()`) → ESM (`import`)
- Args access: `process.argv` → `Bun.argv`
- Timing: `Date.now()` → `Bun.nanoseconds()` (nanosecond precision)
- Testing: Custom harness → `bun:test` native framework
- TypeScript: Direct execution (no build step)

### 4. Performance Test Harness

Created `tests/performance.test.ts` with:

- Fixture generation at arbitrary scale
- Timing measurement using `Bun.nanoseconds()`
- Operations tested: scan, filter, sort, format-table, format-json
- Automatic bottleneck analysis
- Threshold validation

## Extended Performance Test Results

### Operation Timings (ms)

| Scale | scan | filter | sort | format-table | format-json |
|-------|------|--------|------|--------------|-------------|
| 10 | 0.31 | 0.03 | 0.29 | 0.11 | 0.37 |
| 100 | 0.31 | 0.03 | 0.37 | 0.09 | 0.06 |
| 500 | 0.90 | 0.07 | 0.15 | 0.34 | 0.31 |
| 1,000 | 1.92 | 0.04 | 0.27 | 0.27 | 0.82 |
| 10,000 | 10.62 | 0.15 | 6.83 | 2.98 | 5.71 |
| 100,000 | 249.17 | 1.10 | 92.68 | 18.97 | 42.24 |
| 1,000,000 | 4282.39 | 11.88 | 956.76 | 301.36 | 596.54 |

### Bottleneck Analysis

| Scale | Slowest Operation | Time (ms) | Status |
|-------|-------------------|-----------|--------|
| 10 | format-json | 0.37ms | ✓ |
| 100 | sort | 0.37ms | ✓ |
| 500 | scan | 0.90ms | ✓ |
| 1,000 | scan | 1.92ms | ✓ |
| 10,000 | scan | 10.62ms | ✓ |
| 100,000 | scan | 249.17ms | ✓ |
| 1,000,000 | scan | 4282.39ms | ✓ |

## Key Findings

### 1. Scan is the Primary Bottleneck

At scale, filesystem scanning dominates:
- 10k: 10.6ms (linear scaling)
- 100k: 249ms (~25x vs 10x expected - I/O overhead)
- 1M: 4.28s (~17x vs 10x expected)

**Root cause**: `readdirSync()` per category directory + regex matching per file. The I/O overhead grows faster than item count due to directory enumeration costs.

### 2. Sort Becomes Secondary at Scale

Sort shows expected O(n log n) behavior:
- 10k: 6.8ms
- 100k: 92.7ms (~13.6x)
- 1M: 956.8ms (~10.3x)

### 3. Format Operations Scale Linearly

Both table and JSON formatting show near-linear scaling, with JSON being slightly more expensive due to `JSON.stringify()` serialization.

### 4. Filter Remains Negligible

Filter operation stays under 12ms even at 1M items - simple predicate evaluation scales excellently.

## Recommendations

### For Realistic Use (< 10k items)
No optimization needed. All operations complete in under 11ms.

### For Large Scale (10k-100k items)
Consider:
- Caching directory listings
- Parallel directory scanning with `Promise.all()`

### For Very Large Scale (100k+ items)
Would require architectural changes:
- Index file instead of filesystem scanning
- SQLite or similar for query optimization
- Incremental update strategy

### Bun vs Node.js

Bun provides several advantages for internal tooling:
- Direct TypeScript execution (no build step)
- Faster startup (~2-3x vs Node.js)
- Built-in test runner
- Modern ESM by default
- Nanosecond timing precision

## Old Tool Deprecation

The old `tools/mdq/mdq` file can be removed. The new package can be run via:

```bash
# From repo root
bun packages/mdq/src/mdq.ts list

# Or with pnpm script
pnpm -F @mdz/mdq mdq list

# Or link globally
cd packages/mdq && bun link
mdq list
```

## Status

**COMPLETE** - All tasks finished:
- [x] Performance test harness created
- [x] Moved to workspace package structure
- [x] Converted to Bun
- [x] Extended performance tests at 10k/100k/1M
- [x] Bottlenecks documented
