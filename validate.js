// validate.js
// Audit parsed hands: check winners vs distributable pot, side-pot splits, and surface edge cases.
// Usage:
//   node parser_starter.js sample_hand.txt --ndjson | node validate.js
//   node validate.js hands.json

import fs from 'node:fs';

function readInput(arg) {
  if (!arg || arg === '-') {
    const txt = fs.readFileSync(0, 'utf-8').trim();
    if (!txt) return [];
    // Try NDJSON first
    const lines = txt.split('\n').filter(Boolean);
    try { return lines.map(l => JSON.parse(l)); } catch {}
    return JSON.parse(txt);
  } else {
    const txt = fs.readFileSync(arg, 'utf-8').trim();
    try {
      const arr = JSON.parse(txt);
      return Array.isArray(arr) ? arr : [arr];
    } catch {
      return txt.split('\n').filter(Boolean).map(l => JSON.parse(l));
    }
  }
}

function r2(x){ return Number((x??0).toFixed(2)); }

(function main(){
  const arg = process.argv[2] || '-';
  const hands = readInput(arg);
  let mismatches = 0, total = 0;

  for (const h of hands) {
    total++;
    const winners = h?.summary?.winners || [];
    const totalPot = h?.summary?.totalPot ?? null;
    const rake = h?.summary?.rake ?? 0;
    const extras = h?.summary?.extras || {};
    let extraSum = 0; for (const k of Object.keys(extras)) extraSum += extras[k] || 0;

    const distributable = totalPot == null ? null : r2(totalPot - rake - extraSum);
    const collected = r2(winners.reduce((s,w)=> s + (Number(w?.amount) || 0), 0));
    const diff = (distributable == null) ? null : r2(collected - distributable);

    const hasSidePot = (h.summary?.seatResults || []).some(L => /side pot/i.test(String(L)));
    const multiWinners = winners.length > 1;
    const warned = (diff != null && Math.abs(diff) > 0.01);

    if (warned) mismatches++;

    if (warned || hasSidePot || multiWinners) {
      console.log(JSON.stringify({
        handId: h.handId,
        table: h?.table?.name,
        stakes: h?.stakes,
        totalPot, rake, extras: r2(extraSum),
        distributable,
        collected,
        delta: diff,
        winners,
        board: h?.summary?.board || (h?.board?.flop?.length ? [...h.board.flop, h.board.turn, h.board.river].filter(Boolean) : null),
        notes: {
          sidePot: !!hasSidePot,
          multiWinners
        }
      }));
    }
  }

  console.error(`Checked ${total} hands, mismatches > $0.01 against distributable: ${mismatches}`);
})();
