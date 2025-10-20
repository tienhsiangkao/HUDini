#!/usr/bin/env node

/**
 * Regression guard for bankroll graph calculations.
 *
 * Loads the hero graph timeline using the same aggregation logic as the Electron app
 * and checks that the cumulative USD line matches the running total of per-hand results.
 */

const path = require('path');
const process = require('process');

let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.error('Failed to load better-sqlite3. If you see a NODE_MODULE_VERSION mismatch, run `npm rebuild better-sqlite3` or execute this script via `npx electron scripts/verify-hero-graph.cjs`.');
  throw error;
}

const { buildHeroGraphData } = require('../lib/hero_graph.cjs');

function parseArgs(argv) {
  const args = {
    limit: 0,
    tolerance: 0.02,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--limit' && i + 1 < argv.length) {
      args.limit = Number(argv[++i]);
    } else if (arg.startsWith('--limit=')) {
      args.limit = Number(arg.split('=')[1]);
    } else if (arg === '--tolerance' && i + 1 < argv.length) {
      args.tolerance = Number(argv[++i]);
    } else if (arg.startsWith('--tolerance=')) {
      args.tolerance = Number(arg.split('=')[1]);
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    }
  }
  if (!Number.isFinite(args.limit) || args.limit < 0) args.limit = 0;
  if (!Number.isFinite(args.tolerance) || args.tolerance <= 0) args.tolerance = 0.02;
  return args;
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = path.join(__dirname, '..', 'hands.db');
  const db = new Database(dbPath, { readonly: true });
  try {
    const progressEvery = args.verbose ? 100 : 5000;
    const onProgress = (info) => {
      if (!info) return;
      if (info.phase === 'scan') {
        if (!args.verbose && info.rowsScanned % (progressEvery * 5) !== 0) return;
        process.stdout.write(
          `Scanning hands: ${info.rowsScanned.toLocaleString()} examined, ` +
          `${info.selectedCount.toLocaleString()} selected\r`
        );
      } else if (info.phase === 'timeline') {
        if (!args.verbose && info.pointsProcessed % (progressEvery * 5) !== 0 && info.progress < 1) return;
        const formattedCum = (round2(info.latestCumUSD || 0)).toFixed(2);
        process.stdout.write(
          `Building timeline: ${info.pointsProcessed.toLocaleString()}/${info.totalPoints.toLocaleString()} ` +
          `points, cumUSD ${formattedCum}\r`
        );
      }
    };

    const graph = buildHeroGraphData(db, {
      limit: args.limit,
      order: 'oldest',
      progressEvery,
      onProgress,
    });
    process.stdout.write('\n');
    if (!graph.timeline.length) {
      console.log('No hands available in graph timeline.');
      return;
    }

    console.log(`Loaded ${graph.timeline.length.toLocaleString()} hands into timeline (limit=${args.limit || 'all'}, order=oldest).`);
    let manualCum = 0;
    const errors = [];
    graph.timeline.forEach((point, idx) => {
      manualCum = round2(manualCum + Number(point.netUSD || 0));
      const reported = round2(point.cumUSD || 0);
      const diff = Math.abs(manualCum - reported);
      if (diff > args.tolerance) {
        errors.push({
          index: idx + 1,
          handId: point.handId,
          expected: manualCum,
          reported,
          diff: Number(diff.toFixed(4)),
        });
      } else if (args.verbose) {
        if ((idx + 1) % 100 === 0 || idx === graph.timeline.length - 1) {
          console.log(`#${idx + 1} hand=${point.handId || 'unknown'} net=${round2(point.netUSD)} cum=${reported}`);
        }
      }
    });

    const finalReported = round2(graph.timeline[graph.timeline.length - 1].cumUSD || 0);
    if (Math.abs(finalReported - manualCum) > args.tolerance) {
      errors.push({
        index: graph.timeline.length,
        handId: graph.timeline[graph.timeline.length - 1].handId,
        expected: manualCum,
        reported: finalReported,
        diff: Number(Math.abs(finalReported - manualCum).toFixed(4)),
        note: 'Final cumulative mismatch',
      });
    }

    if (errors.length) {
      console.error(`❌ Detected ${errors.length} bankroll discrepancies (tolerance ±${args.tolerance}).`);
      errors.slice(0, 5).forEach((err) => {
        console.error(
          `  hand #${err.index} (${err.handId || 'unknown'}): expected ${err.expected.toFixed(2)} USD,` +
          ` reported ${err.reported.toFixed(2)} USD (diff ${err.diff.toFixed(2)})${err.note ? ' - ' + err.note : ''}`
        );
      });
      if (errors.length > 5) {
        console.error(`  ...and ${errors.length - 5} more.`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`✅ HUDini graph cumulative USD matches manual totals across ${graph.timeline.length} hands. Final bankroll: ${manualCum.toFixed(2)} USD.`);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}
