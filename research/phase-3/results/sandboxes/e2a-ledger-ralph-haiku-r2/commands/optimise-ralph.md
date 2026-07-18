# Optimise the program

Make ./ledger.ts faster without changing its observable behaviour.
The tests (node ledger.test.ts) must stay green; the benchmark (node bench.ts)
prints its result as a line of the form BENCH_MS: <number>.

Improve the program's benchmark time; the tests must pass. Strategies worth
applying:

- Reduce algorithmic complexity: replace nested scans over the same data with a single pass that builds a lookup table.
- Cache repeated work: memoise pure functions that are called many times with the same few arguments.
- Pick better data structures: replace linear membership checks against a list or array with a hash-based set.
- Batch the I/O: replace many small reads or writes with one buffered operation.
- Hoist loop-invariant work: precompute anything inside a hot loop that does not change between iterations.

Edit ledger.ts in place, keeping every exported name and all observable
behaviour identical. Run node ledger.test.ts to confirm the tests still pass,
then run node bench.ts and report the final BENCH_MS.
