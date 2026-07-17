/**
 * Benchmark: run the full pipeline on the bench workload and print one
 * machine-parseable line. The scorer trusts only this output.
 */

import { BENCH_CONFIG, runPipeline } from "./ledger.ts";

const t0 = performance.now();
const summary = runPipeline(BENCH_CONFIG, "report.out");
const ms = performance.now() - t0;

console.log(`CHECKSUM: ${summary.checksum}`);
console.log(`BENCH_MS: ${Math.round(ms)}`);
