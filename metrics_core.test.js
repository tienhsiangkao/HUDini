// metrics_core.test.js
// Basic regression test for computeMetrics aggregation.

import { describe, test, expect } from 'vitest';
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

describe('Metrics Core', () => {
  test('should compute player metrics correctly', () => {
    const [heroRow, villainRow] = computeMetrics([buildSampleHand()]);

    expect(heroRow.player).toBe('Hero');
    expect(heroRow.hands).toBe(1);
    expect(heroRow.VPIP_pct).toBe(100);
    expect(heroRow.PFR_pct).toBe(100);
    expect(heroRow.CBetF_pct).toBe(100);
    expect(heroRow.FoldToCBetT_pct).toBe(100);
    expect(heroRow.WTSD_pct).toBe(0);

    expect(villainRow.player).toBe('Villain');
    expect(villainRow.hands).toBe(1);
    expect(villainRow.VPIP_pct).toBe(100);
    expect(villainRow.PFR_pct).toBe(0);
    expect(villainRow.WWSF_pct).toBe(100);
  });
});
