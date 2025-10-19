// metrics_v2.js
// Enhanced player metrics from parser output (JSON or NDJSON).
// Usage:
//   node parser_starter.js sample_hand.txt --ndjson | node metrics_v2.js > player_stats_v2.csv
//   node metrics_v2.js hands.json > player_stats_v2.csv

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeMetrics } from './lib/metrics_core.js';

function parseInput(pathOrDash) {
  if (!pathOrDash || pathOrDash === '-') {
    const txt = fs.readFileSync(0, 'utf-8').trim();
    if (!txt) return [];
    const lines = txt.split('\n').filter(Boolean);
    try {
      return lines.map((line) => JSON.parse(line));
    } catch {
      return JSON.parse(txt);
    }
  }
  const txt = fs.readFileSync(pathOrDash, 'utf-8').trim();
  try {
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : [arr];
  } catch {
    return txt.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  }
}

function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.0';
  return num.toFixed(1);
}

function toCSV(rows) {
  const columns = [
    'player',
    'hands',
    'VPIP_pct',
    'PFR_pct',
    'ThreeBet_pct',
    'FourBet_pct',
    'Squeeze_pct',
    'CBetF_pct',
    'CBetT_pct',
    'CBetR_pct',
    'FoldToCBetF_pct',
    'FoldToCBetT_pct',
    'FoldToCBetR_pct',
    'WTSD_pct',
    'WWSF_pct',
    'AFq_pct',
    'StealAtt',
    'StealSucc_pct',
    'CheckRaiseF',
  ];

  const stringRows = rows.map((row) => {
    const clone = { ...row };
    clone.VPIP_pct = formatPercent(clone.VPIP_pct);
    clone.PFR_pct = formatPercent(clone.PFR_pct);
    clone.ThreeBet_pct = formatPercent(clone.ThreeBet_pct);
    clone.FourBet_pct = formatPercent(clone.FourBet_pct);
    clone.Squeeze_pct = formatPercent(clone.Squeeze_pct);
    clone.CBetF_pct = formatPercent(clone.CBetF_pct);
    clone.CBetT_pct = formatPercent(clone.CBetT_pct);
    clone.CBetR_pct = formatPercent(clone.CBetR_pct);
    clone.FoldToCBetF_pct = formatPercent(clone.FoldToCBetF_pct);
    clone.FoldToCBetT_pct = formatPercent(clone.FoldToCBetT_pct);
    clone.FoldToCBetR_pct = formatPercent(clone.FoldToCBetR_pct);
    clone.WTSD_pct = formatPercent(clone.WTSD_pct);
    clone.WWSF_pct = formatPercent(clone.WWSF_pct);
    clone.AFq_pct = formatPercent(clone.AFq_pct);
    clone.StealSucc_pct = formatPercent(clone.StealSucc_pct);
    return clone;
  });

  const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.join(',')];
  for (const row of stringRows) {
    lines.push(columns.map((col) => esc(row[col])).join(','));
  }
  return lines.join('\n');
}

function main() {
  const arg = process.argv[2] || '-';
  const hands = parseInput(arg);
  const metrics = computeMetrics(hands);
  process.stdout.write(toCSV(metrics));
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  try {
    main();
  } catch (err) {
    console.error(err?.stack || err?.message || String(err));
    process.exitCode = 1;
  }
}

export { parseInput, toCSV };
