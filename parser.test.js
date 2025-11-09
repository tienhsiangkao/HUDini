// parser.test.js
// Compare winners to the DISTRIBUTABLE pot (Total - Rake - Extras), not Total pot.

import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseHandsText, assignPositions, computeStreetPots } from './parser_starter.js';
import handUtils from './lib/hand_utils.cjs';

const { computeHeroNetFromJson } = handUtils;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const r2 = (x) => Number((x ?? 0).toFixed(2));

describe('Parser', () => {
  test('should parse sample hands and balance pots correctly', () => {
  const samplePath = path.join(__dirname, 'sample_hand.txt');
  expect(fs.existsSync(samplePath)).toBe(true);

  const text = fs.readFileSync(samplePath, 'utf8');
  const hands = parseHandsText(text);
  expect(Array.isArray(hands)).toBe(true);
  expect(hands.length).toBeGreaterThan(0);

  const bad = [];
  for (const hand of hands) {
    assignPositions(hand);
    computeStreetPots(hand);

    expect(hand.handId).toBeTruthy();
    expect(hand.stakes).toBeTruthy();
    expect(hand.stakes.bb).not.toBeNull();
    expect(hand.players).toBeTruthy();
    expect(hand.players.length).toBeGreaterThanOrEqual(2);
    expect(hand.actions).toBeTruthy();
    expect(Array.isArray(hand.actions)).toBe(true);

    const total = hand.summary?.totalPot;
    const rake = hand.summary?.rake || 0;
    const extras = hand.summary?.extras || {};
    let extraSum = 0;
    for (const key of Object.keys(extras)) extraSum += extras[key] || 0;
    const distributable = total != null ? r2(total - rake - extraSum) : null;

    const collected = hand.pots?.totalCollected;
    if (distributable != null && collected != null) {
      const diff = r2(collected - distributable);
      if (Math.abs(diff) > 0.01) {
        bad.push({
          id: hand.handId,
          collected,
          distributable,
          total,
          rake,
          extras: r2(extraSum),
          diff: r2(diff),
        });
      }
    }
  }

  const firstHand = hands[0];
  const netTotal = firstHand.players.reduce((sum, player) => sum + (Number(player.net) || 0), 0);
  const extrasTotal = Object.values(firstHand.summary?.extras || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const rake = Number(firstHand.summary?.rake || 0);
  // Relax tolerance to 0.05 to account for rounding in hand parsing
  expect(Math.abs(netTotal + rake + extrasTotal)).toBeLessThan(0.05);
  for (const player of firstHand.players) {
    const invested = Number(player.invested || 0);
    const wonAmount = Number(player.wonAmount || 0);
    const expectedNet = Number((wonAmount - invested).toFixed(2));
    const actualNet = Number((Number(player.net) || 0).toFixed(2));
    expect(actualNet).toBe(expectedNet);
  }
  const showdownHand = hands.find((hand) => hand.players.some((p) => p.showdown));
  if (showdownHand) {
    showdownHand.players.forEach((player) => {
      if (player.showdown) {
        expect(player.wonAmount).toBeDefined();
      }
    });
  }
  const heroNet = computeHeroNetFromJson(firstHand);
  const heroPlayer = firstHand.players.find((p) => p.name === firstHand.hero);
  expect(heroPlayer).toBeTruthy();
  expect(heroNet).toBe(Number((heroPlayer.net || 0).toFixed(2)));

  if (bad.length) {
    for (const b of bad) {
      console.warn(
        `WARN: hand ${b.id} collected ${b.collected} vs distributable ${b.distributable} ` +
        `(total=${b.total}, rake=${b.rake}, extras=${b.extras}) Δ=${b.diff}`,
      );
    }
  }
  
  expect(bad.length).toBe(0);
  expect(hands.length).toBeGreaterThan(0);
  console.log(`OK: parsed ${hands.length} hands, ${bad.length} mismatches > $0.01 compared to distributable pot`);
  });
});
