// parser.test.js
// Compare winners to the DISTRIBUTABLE pot (Total - Rake - Extras), not Total pot.
// Run: node parser.test.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseHandsText, assignPositions, computeStreetPots } from './parser_starter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const r2 = (x) => Number((x ?? 0).toFixed(2));

(function main() {
  const samplePath = path.join(__dirname, 'sample_hand.txt');
  assert(fs.existsSync(samplePath), 'sample_hand.txt not found');

  const text = fs.readFileSync(samplePath, 'utf8');
  const hands = parseHandsText(text);
  assert(Array.isArray(hands) && hands.length > 0, 'No hands parsed');

  const bad = [];
  for (const hand of hands) {
    assignPositions(hand);
    computeStreetPots(hand);

    assert(hand.handId, 'Missing handId');
    assert(hand.stakes && hand.stakes.bb != null, 'Missing stakes');
    assert(hand.players && hand.players.length >= 2, 'Too few players');
    assert(hand.actions && Array.isArray(hand.actions), 'Missing actions array');

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

  if (bad.length) {
    for (const b of bad) {
      console.warn(
        `WARN: hand ${b.id} collected ${b.collected} vs distributable ${b.distributable} ` +
        `(total=${b.total}, rake=${b.rake}, extras=${b.extras}) Δ=${b.diff}`,
      );
    }
  }
  console.log(`OK: parsed ${hands.length} hands, ${bad.length} mismatches > $0.01 compared to distributable pot`);
})();

