// lib/hand_utils.cjs
// Shared helpers for working with parsed poker hands.

function namesEqual(a, b) {
  return typeof a === 'string'
    && typeof b === 'string'
    && a.trim().toLowerCase() === b.trim().toLowerCase();
}

function getHeroName(hand) {
  if (!hand) return null;
  if (hand.hero) return hand.hero;
  const withCards = (hand.players || []).find((p) => Array.isArray(p.cards) && p.cards.length);
  if (withCards?.name) return withCards.name;
  const summaryHero = hand.summary?.seatResults
    ?.map((line) => {
      if (typeof line !== 'string') return null;
      const match = line.match(/^Seat \d+: ([^(]+?) \(.*?\)/i);
      return match ? match[1].trim() : null;
    })
    .find(Boolean);
  return summaryHero || 'Hero';
}

function parseTimestamp(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (value > 1e12) return value;
    if (value > 1e9) return value * 1000;
    return value;
  }
  let str = String(value).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    if (str.length >= 13) return num;
    if (str.length === 10) return num * 1000;
    return num;
  }
  str = str.replace(/\./g, '-').replace(/\//g, '-');
  str = str.replace(/\s+/g, ' ');
  if (str.includes(' ')) {
    const [datePart, timePart] = str.split(' ', 2);
    str = timePart ? `${datePart}T${timePart}` : datePart;
  }
  const parsed = Date.parse(str);
  return Number.isNaN(parsed) ? null : parsed;
}

function computeHeroNetFromJson(hand) {
  if (!hand) return 0;
  const heroName = getHeroName(hand);
  let win = 0;
  if (hand.summary?.winners?.length) {
    for (const w of hand.summary.winners) {
      if (namesEqual(w.player, heroName)) win += Number(w.amount) || 0;
    }
  }
  let invested = 0;
  for (const action of hand.actions || []) {
    if (!namesEqual(action.player, heroName)) continue;
    if (typeof action.contribution === 'number' && !Number.isNaN(action.contribution)) {
      invested += Number(action.contribution);
      continue;
    }
    if (action.amount == null) continue;
    const amt = Number(action.amount) || 0;
    const type = String(action.type || '').toLowerCase();
    if (['posts', 'bet', 'call', 'all-in'].includes(type)) {
      invested += amt;
    } else if (type === 'raise' || type === 'raises') {
      if (action.raiseFrom != null) {
        invested += Math.max(0, amt - Number(action.raiseFrom));
      } else {
        invested += amt;
      }
    } else if (type === 'return') {
      invested -= amt;
    }
  }
  return Number((win - invested).toFixed(2));
}

module.exports = {
  namesEqual,
  getHeroName,
  parseTimestamp,
  computeHeroNetFromJson,
};
