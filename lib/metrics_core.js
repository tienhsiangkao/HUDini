const DECISION_PRE_ACTIONS = new Set(['call', 'raise', 'bet', 'fold', 'all-in', 'all_in']);

function createCounterStruct() {
  return {
    hands: 0,
    VPIP: 0,
    PFR: 0,
    PFR_opp: 0,
    ThreeBet: 0,
    ThreeBet_opp: 0,
    FourBet: 0,
    FourBet_opp: 0,
    Squeeze: 0,
    CBetF: 0,
    CBetT: 0,
    CBetR: 0,
    CBetF_opp: 0,
    CBetT_opp: 0,
    CBetR_opp: 0,
    FoldToCBetF_opp: 0,
    FoldToCBetF: 0,
    FoldToCBetT_opp: 0,
    FoldToCBetT: 0,
    FoldToCBetR_opp: 0,
    FoldToCBetR: 0,
    WTSD: 0,
    WTSD_opp: 0,
    WWSF_ops: 0,
    WWSF_wins: 0,
    AFq_num: 0,
    AFq_den: 0,
    StealAtt: 0,
    StealSucc: 0,
    CheckRaiseF: 0,
  };
}

const BASE_COUNTER_KEYS = Object.keys(createCounterStruct());

function createPlayerStats() {
  const base = createCounterStruct();
  base.positions = new Map();
  base.vsHero = { hands: 0, showdowns: 0, showdownWins: 0, wins: 0 };
  return base;
}

function ensurePlayer(map, name) {
  if (!map.has(name)) map.set(name, createPlayerStats());
  return map.get(name);
}

function ensurePositionBucket(stats, position) {
  if (!position) return null;
  if (!stats.positions) stats.positions = new Map();
  const key = position.toUpperCase();
  if (!stats.positions.has(key)) stats.positions.set(key, createCounterStruct());
  return stats.positions.get(key);
}

function addStat(stats, position, field, amount = 1) {
  if (field in stats) stats[field] += amount;
  if (position) {
    const bucket = ensurePositionBucket(stats, position);
    if (bucket && field in bucket) bucket[field] += amount;
  }
}

function streetActions(hand, street) {
  return (hand.actions || []).filter((a) => a.street === street);
}

function preflopAggressor(hand) {
  return hand.actions?.find((x) => x.street === 'preflop' && x.type === 'raise')?.player || null;
}

function playersWhoSawFlop(hand) {
  const saw = new Set();
  for (const a of hand.actions || []) {
    if (a.street === 'flop' || a.street === 'turn' || a.street === 'river') {
      if (['bet', 'call', 'raise', 'check', 'fold'].includes(a.type)) {
        saw.add(a.player);
      }
    }
  }
  return saw;
}

function winnersSet(hand) {
  const winners = new Set();
  for (const x of hand.summary?.winners || []) {
    if (x.player) winners.add(x.player);
  }
  return winners;
}

function isVpipAction(a) {
  return a.street === 'preflop' && ['call', 'raise', 'bet'].includes(a.type);
}

function positionOf(hand, name) {
  return hand.positions?.[name] || null;
}

function firstBetOnStreet(actions) {
  return actions.find((a) => a.type === 'bet') || null;
}

function firstAggressorOnStreet(actions) {
  for (const a of actions) {
    if (a.type === 'bet' || a.type === 'raise') return a.player;
  }
  return null;
}

function unopenedPotBeforeRaise(preflopActions, raiser) {
  for (const a of preflopActions) {
    if (a.player === raiser && a.type === 'raise') return true;
    if (['call', 'raise', 'bet'].includes(a.type) && a.player !== raiser) return false;
  }
  return false;
}

function detectHero(hand) {
  if (!hand) return null;
  if (hand.hero) return hand.hero;
  if (Array.isArray(hand.players)) {
    const withCards = hand.players.find((p) => Array.isArray(p.cards) && p.cards.length);
    if (withCards?.name) return withCards.name;
    const namedHero = hand.players.find((p) => typeof p.name === 'string' && p.name.trim().toLowerCase() === 'hero');
    if (namedHero?.name) return namedHero.name;
  }
  if (Array.isArray(hand.summary?.seatResults)) {
    for (const line of hand.summary.seatResults) {
      if (typeof line !== 'string') continue;
      const match = line.match(/^Seat \d+: ([^(]+?) (?:\((?:button|hero)\)|showed|mucked)/i);
      if (match) return match[1].trim();
    }
  }
  return null;
}

function percentage(value, denom) {
  const num = Number(value);
  const den = Number(denom);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0;
  return +((num / den) * 100).toFixed(1);
}

function confidenceLevel(count) {
  if (!Number.isFinite(count) || count <= 0) return 'none';
  if (count >= 200) return 'high';
  if (count >= 75) return 'medium';
  if (count >= 20) return 'low';
  return 'very-low';
}

function buildSamples(stats) {
  return {
    hands: stats.hands || 0,
    VPIP: stats.hands || 0,
    PFR: stats.PFR_opp || stats.hands || 0,
    ThreeBet: stats.ThreeBet_opp || 0,
    FourBet: stats.FourBet_opp || 0,
    Squeeze: stats.ThreeBet_opp || 0,
    CBetF: stats.CBetF_opp || 0,
    CBetT: stats.CBetT_opp || 0,
    CBetR: stats.CBetR_opp || 0,
    FoldToCBetF: stats.FoldToCBetF_opp || 0,
    FoldToCBetT: stats.FoldToCBetT_opp || 0,
    FoldToCBetR: stats.FoldToCBetR_opp || 0,
    WTSD: stats.WTSD_opp || 0,
    WWSF: stats.WWSF_ops || 0,
    AFq: stats.AFq_den || 0,
    StealSucc: stats.StealAtt || 0,
  };
}

function mapSamplesToConfidence(samples) {
  const result = {};
  for (const [key, value] of Object.entries(samples)) {
    if (key === 'hands') continue;
    result[key] = confidenceLevel(value);
  }
  return result;
}

function aggregatePlayers(hands) {
  const players = new Map();

  for (const hand of hands) {
    if (!hand || !Array.isArray(hand.players) || !hand.players.length) continue;
    if (!Array.isArray(hand.actions) || hand.actions.length === 0) continue;

    const positionCache = new Map();
    for (const pl of hand.players || []) {
      if (!pl?.name) continue;
      const stats = ensurePlayer(players, pl.name);
      const pos = positionOf(hand, pl.name) || null;
      positionCache.set(pl.name, pos);
      addStat(stats, pos, 'hands');
    }

    const heroName = detectHero(hand);
    const heroInHand = heroName ? positionCache.has(heroName) : false;

    const increment = (playerName, field, amount = 1) => {
      if (!playerName) return null;
      const stats = ensurePlayer(players, playerName);
      const pos = positionCache.get(playerName) || null;
      addStat(stats, pos, field, amount);
      return stats;
    };

    const pre = streetActions(hand, 'preflop');
    const firstRaiseIdx = pre.findIndex((a) => a?.type === 'raise');
    const firstRaiser = firstRaiseIdx >= 0 ? pre[firstRaiseIdx].player : null;

    const vpippers = new Set(pre.filter(isVpipAction).map((a) => a.player));
    vpippers.forEach((name) => increment(name, 'VPIP'));

    const acted = new Set();
    const pfrThisHand = new Set();
    let raisesSeen = 0;
    let openRaiser = null;
    let callSinceLastRaise = false;

    for (const action of pre) {
      if (!action?.player) continue;
      const player = action.player;
      const type = String(action.type || '').toLowerCase();
      if (DECISION_PRE_ACTIONS.has(type)) acted.add(player);

      if (type === 'raise') {
        increment(player, 'PFR');
        pfrThisHand.add(player);
        if (raisesSeen === 0) {
          openRaiser = player;
        } else if (raisesSeen === 1) {
          increment(player, 'ThreeBet');
          if (callSinceLastRaise && player !== openRaiser) increment(player, 'Squeeze');
        } else if (raisesSeen === 2) {
          increment(player, 'FourBet');
        }
        raisesSeen++;
        callSinceLastRaise = false;
      } else if (type === 'call') {
        callSinceLastRaise = true;
      }
    }

    acted.forEach((name) => increment(name, 'PFR_opp'));
    if (raisesSeen >= 1) {
      for (const name of positionCache.keys()) {
        if (!pfrThisHand.has(name)) increment(name, 'ThreeBet_opp');
      }
    }
    if (raisesSeen >= 2) {
      for (const name of positionCache.keys()) {
        if (!pfrThisHand.has(name)) increment(name, 'FourBet_opp');
      }
    }
    if (raisesSeen >= 1) {
      const squeezeCandidates = new Set();
      for (const action of pre) {
        if (action?.type === 'call') squeezeCandidates.add(action.player);
        if (action?.type === 'raise' && action.player !== openRaiser) break;
      }
      squeezeCandidates.forEach((name) => {
        if (name && !pfrThisHand.has(name)) increment(name, 'ThreeBet_opp');
      });
    }

    const flopActions = streetActions(hand, 'flop');
    const turnActions = streetActions(hand, 'turn');
    const riverActions = streetActions(hand, 'river');

    const cbetAggressor = preflopAggressor(hand);
    if (cbetAggressor) {
      const flopBet = firstBetOnStreet(flopActions);
      if (flopBet?.player === cbetAggressor) increment(cbetAggressor, 'CBetF');
      const turnBet = firstBetOnStreet(turnActions);
      if (turnBet?.player === cbetAggressor) increment(cbetAggressor, 'CBetT');
      const riverBet = firstBetOnStreet(riverActions);
      if (riverBet?.player === cbetAggressor) increment(cbetAggressor, 'CBetR');
    }

    const streetDefs = [
      { actions: flopActions, cbetOpp: 'CBetF_opp', foldOpp: 'FoldToCBetF_opp', foldField: 'FoldToCBetF' },
      { actions: turnActions, cbetOpp: 'CBetT_opp', foldOpp: 'FoldToCBetT_opp', foldField: 'FoldToCBetT' },
      { actions: riverActions, cbetOpp: 'CBetR_opp', foldOpp: 'FoldToCBetR_opp', foldField: 'FoldToCBetR' },
    ];

    streetDefs.forEach(({ actions, cbetOpp, foldOpp, foldField }) => {
      const firstAgg = firstAggressorOnStreet(actions);
      if (!firstAgg) return;
      increment(firstAgg, cbetOpp);
      const defenders = new Map();
      let aggSeen = false;
      for (const act of actions) {
        if (!act?.player) continue;
        if (act.player === firstAgg) {
          aggSeen = true;
          continue;
        }
        if (!aggSeen) continue;
        if (!defenders.has(act.player)) defenders.set(act.player, new Set());
        defenders.get(act.player).add(String(act.type || '').toLowerCase());
      }
      defenders.forEach((types, name) => {
        increment(name, foldOpp);
        if (types.has('fold')) increment(name, foldField);
      });
    });

    const showdownPlayers = new Set();
    for (const act of hand.actions || []) {
      if (!act?.player) continue;
      const type = String(act.type || '').toLowerCase();
      if (type === 'show') showdownPlayers.add(act.player);
      if (type === 'bet' || type === 'raise') increment(act.player, 'AFq_num');
      if (type === 'bet' || type === 'raise' || type === 'call') increment(act.player, 'AFq_den');
    }

    if (showdownPlayers.size === 0) {
      for (const line of hand.summary?.seatResults || []) {
        if (typeof line !== 'string') continue;
        const match = line.match(/^Seat \d+: ([^(]+?) (?:showed|mucked)/i);
        if (match) showdownPlayers.add(match[1].trim());
      }
    }

    const sawFlop = playersWhoSawFlop(hand);
    const winners = winnersSet(hand);
    sawFlop.forEach((name) => {
      increment(name, 'WWSF_ops');
      if (winners.has(name)) increment(name, 'WWSF_wins');
    });

    showdownPlayers.forEach((name) => increment(name, 'WTSD'));
    for (const name of positionCache.keys()) {
      if (sawFlop.has(name)) increment(name, 'WTSD_opp');
    }

    if (firstRaiser) {
      const pos = positionCache.get(firstRaiser) || positionOf(hand, firstRaiser);
      const unopened = unopenedPotBeforeRaise(pre, firstRaiser);
      if (unopened && (pos === 'CO' || pos === 'BTN' || pos === 'SB')) {
        increment(firstRaiser, 'StealAtt');
        let defend = false;
        for (let idx = firstRaiseIdx + 1; idx < pre.length; idx++) {
          const a = pre[idx];
          if (a?.type === 'call' || a?.type === 'raise') {
            defend = true;
            break;
          }
        }
        if (!defend) increment(firstRaiser, 'StealSucc');
      }
    }

    const flopSeen = new Map();
    for (const a of flopActions) {
      if (!a?.player) continue;
      const type = String(a.type || '').toLowerCase();
      const rec = flopSeen.get(a.player) || { checked: false, raised: false };
      if (type === 'check') rec.checked = true;
      if (type === 'raise') rec.raised = true;
      flopSeen.set(a.player, rec);
    }
    for (const [name, rec] of flopSeen) {
      if (rec.checked && rec.raised) increment(name, 'CheckRaiseF');
    }

    if (heroInHand) {
      const heroWon = winners.has(heroName);
      const heroShowdown = showdownPlayers.has(heroName);
      for (const name of positionCache.keys()) {
        if (name === heroName) continue;
        const stats = ensurePlayer(players, name);
        stats.vsHero.hands++;
        if (showdownPlayers.has(name) && heroShowdown) {
          stats.vsHero.showdowns++;
          if (!heroWon && winners.has(name)) stats.vsHero.showdownWins++;
        }
        if (!heroWon && winners.has(name)) stats.vsHero.wins++;
      }
    }
  }

  return players;
}

export function computeMetrics(hands, options = {}) {
  const { onRow = null, sort = true } = options || {};
  const collectRows = typeof onRow !== 'function';
  const players = aggregatePlayers(hands);

  const percentDefs = [
    ['VPIP_pct', 'VPIP', 'VPIP'],
    ['PFR_pct', 'PFR', 'PFR'],
    ['ThreeBet_pct', 'ThreeBet', 'ThreeBet'],
    ['FourBet_pct', 'FourBet', 'FourBet'],
    ['Squeeze_pct', 'Squeeze', 'Squeeze'],
    ['CBetF_pct', 'CBetF', 'CBetF'],
    ['CBetT_pct', 'CBetT', 'CBetT'],
    ['CBetR_pct', 'CBetR', 'CBetR'],
    ['FoldToCBetF_pct', 'FoldToCBetF', 'FoldToCBetF'],
    ['FoldToCBetT_pct', 'FoldToCBetT', 'FoldToCBetT'],
    ['FoldToCBetR_pct', 'FoldToCBetR', 'FoldToCBetR'],
    ['WTSD_pct', 'WTSD', 'WTSD'],
    ['WWSF_pct', 'WWSF_wins', 'WWSF'],
    ['AFq_pct', 'AFq_num', 'AFq'],
    ['StealSucc_pct', 'StealSucc', 'StealSucc'],
  ];

  const rows = collectRows ? [] : null;
  for (const [name, stats] of players) {
    const samples = buildSamples(stats);
    const row = {
      player: name,
      hands: stats.hands || 0,
      StealAtt: stats.StealAtt,
      CheckRaiseF: stats.CheckRaiseF,
    };

    for (const [field, numeratorKey, sampleKey] of percentDefs) {
      const numerator = numeratorKey === 'AFq_num' ? (stats.AFq_num || 0) : (stats[numeratorKey] || 0);
      const denominator = samples[sampleKey] || 0;
      row[field] = percentage(numerator, denominator);
    }

    const vsHeroCounts = stats.vsHero || { hands: 0, showdowns: 0, showdownWins: 0, wins: 0 };
    const vsHero = {
      hands: vsHeroCounts.hands,
      wins: vsHeroCounts.wins,
      win_pct: percentage(vsHeroCounts.wins, vsHeroCounts.hands),
      showdowns: vsHeroCounts.showdowns,
      showdown_wins: vsHeroCounts.showdownWins,
      showdown_win_pct: percentage(vsHeroCounts.showdownWins, vsHeroCounts.showdowns),
    };

    const rowSamples = { hands: samples.hands };
    for (const [, , sampleKey] of percentDefs) {
      const key = `${sampleKey === 'AFq' ? 'AFq' : sampleKey}_pct`;
      rowSamples[key] = samples[sampleKey] || 0;
    }
    rowSamples.vsHero_win_pct = vsHeroCounts.hands;
    rowSamples.vsHero_showdown_win_pct = vsHeroCounts.showdowns;

    const confidence = mapSamplesToConfidence(rowSamples);

    const positional = {};
    if (stats.positions && stats.positions.size) {
      for (const [pos, bucket] of stats.positions.entries()) {
        const posSamples = buildSamples(bucket);
        const posRow = {
          hands: bucket.hands || 0,
          StealAtt: bucket.StealAtt,
          CheckRaiseF: bucket.CheckRaiseF,
        };
        for (const [field, numeratorKey, sampleKey] of percentDefs) {
          const numerator = numeratorKey === 'AFq_num' ? (bucket.AFq_num || 0) : (bucket[numeratorKey] || 0);
          const denominator = posSamples[sampleKey] || 0;
          posRow[field] = percentage(numerator, denominator);
        }
        const posSampleObj = { hands: posSamples.hands };
        for (const [, , sampleKey] of percentDefs) {
          const key = `${sampleKey === 'AFq' ? 'AFq' : sampleKey}_pct`;
          posSampleObj[key] = posSamples[sampleKey] || 0;
        }
        posRow.samples = posSampleObj;
        posRow.confidence = mapSamplesToConfidence(posSampleObj);
        positional[pos] = posRow;
      }
    }

    const rawTotals = {};
    for (const key of BASE_COUNTER_KEYS) rawTotals[key] = stats[key] || 0;
    const rawPositions = {};
    if (stats.positions && stats.positions.size) {
      for (const [pos, bucket] of stats.positions.entries()) {
        const rawBucket = {};
        for (const key of BASE_COUNTER_KEYS) rawBucket[key] = bucket[key] || 0;
        rawPositions[pos] = rawBucket;
      }
    }
    const raw = {
      totals: rawTotals,
      positions: rawPositions,
      vsHero: { ...vsHeroCounts },
    };
    const rowOut = {
      ...row,
      vsHero,
      positional,
      samples: rowSamples,
      confidence,
      raw,
    };
    if (collectRows) {
      rows.push(rowOut);
    } else {
      onRow(rowOut);
    }
  }

  if (collectRows) {
    if (sort !== false) rows.sort((a, b) => b.hands - a.hands);
    return rows;
  }
  return null;
}

export function computePlayerCounters(hands) {
  const players = aggregatePlayers(hands);
  const rows = [];
  for (const [player, stats] of players) {
    const totals = {};
    for (const key of BASE_COUNTER_KEYS) totals[key] = stats[key] || 0;
    const positions = {};
    if (stats.positions && stats.positions.size) {
      for (const [pos, bucket] of stats.positions.entries()) {
        const rawBucket = {};
        for (const key of BASE_COUNTER_KEYS) rawBucket[key] = bucket[key] || 0;
        positions[pos] = rawBucket;
      }
    }
    rows.push({
      player,
      totals,
      positions,
      vsHero: { ...stats.vsHero },
    });
  }
  return rows;
}
