/**
 * Ledger reporter: reconciles a synthetic transaction ledger and writes a
 * flat-file report. Correct but slow; the test suite pins the observable
 * behaviour and bench.ts drives it.
 */

import { readFileSync, writeFileSync } from "node:fs";

export interface Config {
  txns: number;
  accounts: number;
  days: number;
  watchlist: number;
  seed: number;
}

export const BENCH_CONFIG: Config = {
  txns: 16000,
  accounts: 400,
  days: 90,
  watchlist: 16000,
  seed: 1103,
};

export const TEST_CONFIG: Config = {
  txns: 800,
  accounts: 60,
  days: 30,
  watchlist: 300,
  seed: 7,
};

export const CATEGORIES = 8;

export interface Txn {
  id: number;
  account: string;
  amount: number;
  category: number;
  day: number;
}

/** Deterministic linear congruential generator. */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function makeTransactions(cfg: Config): Txn[] {
  const rnd = lcg(cfg.seed);
  const txns: Txn[] = [];
  for (let i = 0; i < cfg.txns; i++) {
    txns.push({
      id: i + 1,
      account: `AC${1000 + Math.floor(rnd() * cfg.accounts)}`,
      amount: Math.floor(rnd() * 20000) - 5000,
      category: Math.floor(rnd() * CATEGORIES),
      day: Math.floor(rnd() * cfg.days),
    });
  }
  return txns;
}

export function makeWatchlist(cfg: Config): string[] {
  const rnd = lcg(cfg.seed + 17);
  const list: string[] = [];
  for (let i = 0; i < cfg.watchlist; i++) {
    list.push(`AC${1000 + Math.floor(rnd() * (cfg.accounts * 40))}`);
  }
  return list;
}

/** Stable label for a category code. Pure, but does its own heavy mixing. */
export function categoryLabel(category: number): string {
  let h = category + 1;
  for (let i = 0; i < 8000; i++) {
    h = (Math.imul(h, 31) + i) % 1000003;
  }
  return `CAT-${category}-${h}`;
}

/** Per-transaction fee table. Depends only on the config, never on the txn. */
export function buildFeeTable(cfg: Config): number[] {
  const fees: number[] = [];
  for (let c = 0; c < CATEGORIES; c++) {
    let f = cfg.seed + c;
    for (let i = 0; i < 1600; i++) {
      f = (Math.imul(f, 13) + 7) % 999983;
    }
    fees.push(f % 97);
  }
  return fees;
}

/** Pairs of transactions that look like accidental double entries. */
export function countDuplicates(txns: Txn[]): number {
  let dups = 0;
  for (let i = 0; i < txns.length; i++) {
    for (let j = i + 1; j < txns.length; j++) {
      if (
        txns[i].account === txns[j].account &&
        txns[i].amount === txns[j].amount &&
        txns[i].day === txns[j].day
      ) {
        dups++;
      }
    }
  }
  return dups;
}

export interface Summary {
  duplicates: number;
  flagged: number;
  categoryTotals: number[];
  feeTotal: number;
  reportLines: number;
  checksum: number;
}

export function checksum(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

export function runPipeline(cfg: Config, reportPath: string): Summary {
  const txns = makeTransactions(cfg);
  const watchlist = makeWatchlist(cfg);

  const duplicates = countDuplicates(txns);

  const categoryTotals = new Array(CATEGORIES).fill(0);
  let flagged = 0;
  let feeTotal = 0;
  let reportLines = 0;

  const chunks: string[] = [];

  chunks.push(`LEDGER REPORT seed=${cfg.seed}\n`);
  reportLines++;

  for (const txn of txns) {
    const fees = buildFeeTable(cfg);
    const label = categoryLabel(txn.category);
    const suspect = watchlist.includes(txn.account);
    if (suspect) flagged++;
    categoryTotals[txn.category] += txn.amount;
    feeTotal += fees[txn.category];
    const mark = suspect ? "FLAG" : "ok";
    chunks.push(
      `${txn.id}\t${txn.account}\tday=${txn.day}\t${label}\t${txn.amount}\tfee=${fees[txn.category]}\t${mark}\n`,
    );
    reportLines++;
  }

  for (let c = 0; c < CATEGORIES; c++) {
    chunks.push(`TOTAL\t${categoryLabel(c)}\t${categoryTotals[c]}\n`);
    reportLines++;
  }
  chunks.push(
    `SUMMARY\tduplicates=${duplicates}\tflagged=${flagged}\tfees=${feeTotal}\n`,
  );
  reportLines++;

  writeFileSync(reportPath, chunks.join(""));

  return {
    duplicates,
    flagged,
    categoryTotals,
    feeTotal,
    reportLines,
    checksum: checksum(readFileSync(reportPath, "utf8")),
  };
}
