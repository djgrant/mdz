# Optimise the program

Make ./logscan.py faster without changing its observable behaviour.
The tests (python3 test_logscan.py) must stay green; the benchmark (python3 bench.py)
prints its result as a line of the form BENCH_MS: <number>.

Explore five optimisation strategies, then select the best. The strategies:

- Reduce algorithmic complexity: replace nested scans over the same data with a single pass that builds a lookup table.
- Cache repeated work: memoise pure functions that are called many times with the same few arguments.
- Pick better data structures: replace linear membership checks against a list or array with a hash-based set.
- Batch the I/O: replace many small reads or writes with one buffered operation.
- Hoist loop-invariant work: precompute anything inside a hot loop that does not change between iterations.

Produce a separate candidate version of logscan.py for each strategy, each a
complete file under candidates/, applying exactly one strategy per candidate and
keeping every exported name and all observable behaviour identical. Then, for
each candidate in turn, copy it over logscan.py, run python3 test_logscan.py and
then python3 bench.py, and note its BENCH_MS. Leave the fastest candidate that
passes the tests in place as logscan.py (restore the original if none
passes) and report the winning strategy and its BENCH_MS.
