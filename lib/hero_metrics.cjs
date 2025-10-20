const {
  namesEqual,
  getHeroName,
  parseTimestamp,
  computeHeroNetFromJson,
} = require('./hand_utils.cjs');

const HERO_DECISION_ACTIONS = new Set(['call', 'raise', 'bet', 'fold', 'all-in', 'all_in']);

function streetActions(hand, street) {
  return (hand?.actions || []).filter((action) => action?.street === street);
}

function firstBetOnStreet(actions = []) {
  return actions.find((a) => {
    if (!a) return false;
    const type = String(a.type || '').toLowerCase();
    return type === 'bet' || type === 'all-in';
  }) || null;
}

function heroReachedShowdown(hand, heroName) {
  if (!hand) return false;
  for (const action of hand.actions || []) {
    if (!action?.player) continue;
    const type = String(action.type || '').toLowerCase();
    if ((type === 'show' || type === 'shows') && namesEqual(action.player, heroName)) {
      return true;
    }
  }
  const showed = new Set();
  for (const action of hand.actions || []) {
    if (!action?.player) continue;
    const type = String(action.type || '').toLowerCase();
    if (type.startsWith('show')) showed.add(action.player);
  }
  if (showed.size === 0) {
    for (const line of hand.summary?.seatResults || []) {
      if (typeof line !== 'string') continue;
      const match = line.match(/^Seat \d+: ([^(]+?) (?:showed|mucked)/i);
      if (match) showed.add(match[1].trim());
    }
  }
  return Array.from(showed).some((p) => namesEqual(p, heroName));
}

function computeStreetCBetMetrics(actions, heroName) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return { opp: 0, made: 0, heroContinues: false };
  }
  let heroPresent = false;
  let heroFolded = false;
  let opponentsPresent = false;
  let firstAggressive = null;
  for (const action of actions) {
    if (!action?.player) continue;
    const player = action.player;
    const type = String(action.type || '').toLowerCase();
    if (namesEqual(player, heroName)) {
      heroPresent = true;
      if (type === 'fold') {
        heroFolded = true;
      }
    } else {
      opponentsPresent = true;
    }
    if (!firstAggressive && (type === 'bet' || type === 'all-in' || type === 'raise')) {
      firstAggressive = action;
    }
  }
  if (!heroPresent || !opponentsPresent) {
    return { opp: 0, made: 0, heroContinues: heroPresent && !heroFolded };
  }
  const made = firstAggressive && namesEqual(firstAggressive.player, heroName) ? 1 : 0;
  return { opp: 1, made, heroContinues: !heroFolded };
}

function computeHeroHandMetrics(hand, row = {}) {
  if (!hand) return null;
  const heroName = getHeroName(hand);
  if (!heroName) return null;
  const preferPositive = (...values) => {
    for (const value of values) {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) return num;
    }
    return 0;
  };
  const findPost = (target) => {
    const lower = String(target || '').toLowerCase();
    return (hand.actions || []).find((action) => {
      if (!action) return false;
      if (String(action.type || '').toLowerCase() !== 'posts') return false;
      return String(action.postType || '').toLowerCase().includes(lower);
    }) || null;
  };
  const bigBlindPost = findPost('big blind');
  const smallBlindPost = findPost('small blind');
  const sbValue = preferPositive(
    row.sb,
    hand.stakes?.sb,
    hand.sb,
    smallBlindPost?.amount,
    bigBlindPost?.amount ? bigBlindPost.amount / 2 : undefined
  );
  const bbValue = preferPositive(
    row.bb,
    hand.stakes?.bb,
    hand.bb,
    bigBlindPost?.amount,
    smallBlindPost?.amount ? smallBlindPost.amount * 2 : undefined
  );
  const tableName = row?.tableName ?? hand.table?.name ?? hand.tableName ?? null;
  const normalizedTable = String(tableName || '').toLowerCase();
  const isRedEnvelope = normalizedTable.includes('red envelope') || normalizedTable.includes('redenvelope') || normalizedTable.includes('红包');
  const formatStakePart = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    const abs = Math.abs(num);
    let decimals;
    if (abs >= 10) {
      decimals = 0;
    } else if (abs >= 1) {
      decimals = 2;
    } else if (abs >= 0.1) {
      decimals = 2;
    } else if (abs >= 0.01) {
      decimals = 2;
    } else {
      decimals = 4;
    }
    const fixed = num.toFixed(decimals);
    if (decimals === 0) return fixed;
    return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  };
  let stakeKey;
  let stakeLabel;
  if (isRedEnvelope) {
    stakeKey = 'special:red-envelope';
    stakeLabel = 'Red Envelope';
  } else if (bbValue > 0) {
    const sbForLabel = sbValue > 0 ? sbValue : bbValue / 2;
    stakeKey = `${sbForLabel.toFixed(2)}/${bbValue.toFixed(2)}`;
    stakeLabel = `${formatStakePart(sbForLabel)} / ${formatStakePart(bbValue)}`;
  } else {
    stakeKey = 'special:unknown';
    stakeLabel = 'Unknown Stake';
  }
  const netUSD = typeof row.heroNet === 'number' ? row.heroNet : computeHeroNetFromJson(hand);
  const dateUTCValueRaw = row?.dateUTC ?? hand?.dateUTC ?? hand?.header?.dateUTC ?? null;
  const tsValueRaw = Number.isFinite(row?.ts) ? Number(row.ts) : null;
  const tsParsed = tsValueRaw ?? parseTimestamp(row?.ts) ?? parseTimestamp(row?.dateUTC) ?? parseTimestamp(hand?.ts) ?? parseTimestamp(hand?.dateUTC) ?? parseTimestamp(hand?.header?.dateUTC);
  const tsValue = Number.isFinite(tsParsed) ? tsParsed : null;
  const netBB = bbValue > 0 ? netUSD / bbValue : 0;
  const showdown = heroReachedShowdown(hand, heroName);
  const showdownUSD = showdown ? netUSD : 0;
  const nonShowdownUSD = showdown ? 0 : netUSD;
  const showdownBB = showdown ? netBB : 0;
  const nonShowdownBB = showdown ? 0 : netBB;
  const pre = streetActions(hand, 'preflop');
  const firstRaiseAction = pre.find((a) => String(a?.type || '').toLowerCase() === 'raise');
  const firstRaiser = firstRaiseAction?.player || null;
  let raisesSeen = 0;
  let heroThreeBetOpp = 0;
  let heroThreeBet = 0;
  let heroThreeBetRecorded = false;
  for (const action of pre) {
    if (!action?.player) continue;
    const player = action.player;
    const type = String(action.type || '').toLowerCase();
    const raisesBefore = raisesSeen;
    if (namesEqual(player, heroName) &&
        HERO_DECISION_ACTIONS.has(type) &&
        raisesBefore === 1 &&
        firstRaiser &&
        !namesEqual(firstRaiser, heroName) &&
        !heroThreeBetRecorded) {
      heroThreeBetOpp++;
      if (type === 'raise') heroThreeBet++;
      heroThreeBetRecorded = true;
    }
    if (type === 'return' || type === 'uncalled' || type === 'show') {
      continue;
    }
    if (type === 'call' || type === 'fold') {
      continue;
    }
    if (type === 'raise') {
      raisesSeen++;
    }
  }
  const heroPreActions = pre.filter((a) => a?.player && namesEqual(a.player, heroName));
  const heroDecisionActions = heroPreActions.filter((a) => HERO_DECISION_ACTIONS.has(String(a?.type || '').toLowerCase()));
  const heroHadDecision = heroDecisionActions.length > 0;
  const heroVpip = heroDecisionActions.some((a) => {
    const t = String(a?.type || '').toLowerCase();
    return t === 'call' || t === 'raise' || t === 'bet';
  }) ? 1 : 0;
  const heroPfr = heroDecisionActions.some((a) => String(a?.type || '').toLowerCase() === 'raise') ? 1 : 0;
  const heroSawFlop = (hand.actions || []).some((a) => a?.player && namesEqual(a.player, heroName) && a.street === 'flop');
  const heroWon = Array.isArray(hand.summary?.winners)
    ? hand.summary.winners.some((w) => namesEqual(w.player, heroName))
    : false;
  const heroIsAggressor = firstRaiser && namesEqual(firstRaiser, heroName);
  const flopMetrics = computeStreetCBetMetrics(streetActions(hand, 'flop'), heroName);
  const heroOnFlop = heroIsAggressor ? flopMetrics : { opp: 0, made: 0, heroContinues: false };
  const turnMetrics = computeStreetCBetMetrics(streetActions(hand, 'turn'), heroName);
  const heroOnTurn = heroIsAggressor && heroOnFlop.heroContinues ? turnMetrics : { opp: 0, made: 0, heroContinues: false };
  const riverMetrics = computeStreetCBetMetrics(streetActions(hand, 'river'), heroName);
  const heroOnRiver = heroIsAggressor && heroOnFlop.heroContinues && heroOnTurn.heroContinues ? riverMetrics : { opp: 0, made: 0, heroContinues: false };
  let heroInvested = 0;
  const contributions = new Map();
  const recordContribution = (player, amount) => {
    if (!player) return;
    const prev = contributions.get(player) || 0;
    contributions.set(player, prev + amount);
  };
  for (const action of hand.actions || []) {
    if (!action?.player) continue;
    const player = action.player;
    const type = String(action.type || '').toLowerCase();
    const amount = Number(action.amount ?? action.contribution ?? action.total) || 0;
    if (type === 'return' || type === 'uncalled') {
      recordContribution(player, -Math.abs(amount));
      continue;
    }
    if (amount > 0) {
      recordContribution(player, amount);
    }
    if (namesEqual(player, heroName)) {
      if (type === 'raise' && action.raiseFrom != null) {
        const raiseFrom = Number(action.raiseFrom) || 0;
        heroInvested += Math.max(0, amount - raiseFrom);
      } else if (amount > 0 && type !== 'show') {
        heroInvested += amount;
      }
    }
  }
  let positiveInvested = 0;
  for (const value of contributions.values()) {
    if (value > 0) positiveInvested += value;
  }
  const heroContribution = Math.max(0, Number(contributions.get(heroName) || heroInvested || 0));
  let heroShare = positiveInvested > 0 ? heroContribution / positiveInvested : 0;
  if (!Number.isFinite(heroShare) || heroShare < 0) heroShare = 0;
  if (heroShare > 1) heroShare = 1;
  const totalRake = Number(hand?.summary?.rake ?? 0);
  const extras = hand?.summary?.extras || {};
  const heroRake = totalRake * heroShare;
  const heroExtras = {};
  let extrasOther = 0;
  for (const key of Object.keys(extras)) {
    const value = Number(extras[key] || 0);
    const share = value * heroShare;
    heroExtras[key] = share;
    if (key !== 'jackpot') extrasOther += share;
  }
  const heroJackpot = heroExtras.jackpot ?? 0;
  const heroExtrasOther = extrasOther;
  const heroRakeTotal = heroRake + heroJackpot + heroExtrasOther;
  const heroPreRakeUSD = netUSD + heroRakeTotal;
  const heroPreRakeBB = bbValue > 0 ? heroPreRakeUSD / bbValue : 0;
  const heroRakeBB = bbValue > 0 ? heroRake / bbValue : 0;
  const heroRakeTotalBB = bbValue > 0 ? heroRakeTotal / bbValue : 0;
  const position = hand.positions?.[heroName] || null;
  return {
    heroName,
    sb: sbValue,
    bb: bbValue,
    stakeKey,
    stakeLabel,
    stakeSort: bbValue > 0 ? bbValue : 0,
    position,
    netUSD,
    netBB,
    showdown,
    showdownUSD,
    showdownBB,
    nonShowdownUSD,
    nonShowdownBB,
    threeBetOpp: heroThreeBetOpp,
    threeBet: heroThreeBet,
    cbetF_opp: heroIsAggressor ? heroOnFlop.opp : 0,
    cbetF: heroIsAggressor ? heroOnFlop.made : 0,
    cbetT_opp: heroIsAggressor ? (heroOnFlop.heroContinues ? heroOnTurn.opp : 0) : 0,
    cbetT: heroIsAggressor ? (heroOnFlop.heroContinues ? heroOnTurn.made : 0) : 0,
    cbetR_opp: heroIsAggressor ? (heroOnFlop.heroContinues && heroOnTurn.heroContinues ? heroOnRiver.opp : 0) : 0,
    cbetR: heroIsAggressor ? (heroOnFlop.heroContinues && heroOnTurn.heroContinues ? heroOnRiver.made : 0) : 0,
    heroRake,
    heroJackpot,
    heroExtrasOther,
    heroRakeTotal,
    heroPreRakeUSD,
    heroPreRakeBB,
    heroRakeBB,
    heroRakeTotalBB,
    vpip: heroVpip,
    vpipOpp: heroHadDecision ? 1 : 0,
    pfr: heroPfr,
    pfrOpp: heroHadDecision ? 1 : 0,
    wtsd: showdown ? 1 : 0,
    wtsdOpp: heroSawFlop ? 1 : 0,
    wwsf: heroSawFlop && heroWon ? 1 : 0,
    wwsfOpp: heroSawFlop ? 1 : 0,
    bbValue,
    ts: tsValue,
    dateUTC: dateUTCValueRaw ?? (tsValue ? new Date(tsValue).toISOString() : null),
    id: row?.id ?? hand.id ?? hand.handId ?? null,
    tableName,
  };
}

module.exports = {
  HERO_DECISION_ACTIONS,
  streetActions,
  firstBetOnStreet,
  computeStreetCBetMetrics,
  heroReachedShowdown,
  computeHeroHandMetrics,
};
