// metrics_core.test.js
// Basic regression test for computeMetrics aggregation.

import assert from 'node:assert/strict';

import { computeMetrics } from './lib/metrics_core.js';

function buildSampleHand() {
  return {
    handId: 'unit-test-hand',
    players: [
      { name: 'Hero' },
      { name: 'Villain' },
    ],
    positions: {
      Hero: 'BTN',
      Villain: 'SB',
    },
    actions: [
      { street: 'preflop', type: 'posts', player: 'Hero', amount: 1, contribution: 1 },
      { street: 'preflop', type: 'posts', player: 'Villain', amount: 2, contribution: 2 },
      { street: 'preflop', type: 'raise', player: 'Hero', amount: 6, contribution: 5, raiseFrom: 2 },
      { street: 'preflop', type: 'call', player: 'Villain', amount: 4, contribution: 4 },
      { street: 'flop', type: 'bet', player: 'Hero', amount: 5, contribution: 5 },
      { street: 'flop', type: 'call', player: 'Villain', amount: 5, contribution: 5 },
      { street: 'turn', type: 'check', player: 'Hero' },
      { street: 'turn', type: 'bet', player: 'Villain', amount: 10, contribution: 10 },
      { street: 'turn', type: 'fold', player: 'Hero' },
    ],
    summary: {
      winners: [{ player: 'Villain', amount: 30 }],
    },
  };
}

const [heroRow, villainRow] = computeMetrics([buildSampleHand()]);

assert.equal(heroRow.player, 'Hero');
assert.equal(heroRow.hands, 1);
assert.equal(heroRow.VPIP_pct, 100);
assert.equal(heroRow.PFR_pct, 100);
assert.equal(heroRow.CBetF_pct, 100);
assert.equal(heroRow.FoldToCBetT_pct, 100);
assert.equal(heroRow.WTSD_pct, 0);

assert.equal(villainRow.player, 'Villain');
assert.equal(villainRow.hands, 1);
assert.equal(villainRow.VPIP_pct, 100);
assert.equal(villainRow.PFR_pct, 0);
assert.equal(villainRow.WWSF_pct, 100);

console.log('metrics_core.test.js passed');
