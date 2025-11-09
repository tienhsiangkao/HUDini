/**
 * Aggregators Utilities
 * Functions for aggregating hand data and computing session/report statistics
 */

/**
 * Aggregate hands for reports and session analysis
 * Calculates VPIP, PFR, 3-bet, C-bet, WTSD statistics
 * 
 * @param {Array} hands - Array of hand rows with json property
 * @param {string} heroName - Hero player name (default: 'Hero')
 * @returns {Object} Aggregated statistics
 */
function aggregateHandsForReports(hands, heroName = 'Hero') {
  const DECISION_PRE_ACTIONS = new Set(['call', 'raise', 'bet', 'fold', 'all-in', 'all_in']);
  
  const stats = {
    hands: 0,
    VPIP: 0,
    PFR: 0,
    PFR_opp: 0,
    ThreeBet: 0,
    ThreeBet_opp: 0,
    CBetF: 0,
    CBetF_opp: 0,
    WTSD: 0,
    WTSD_opp: 0,
    totalWon: 0,
    totalBB: 0
  };

  for (const handRow of hands) {
    try {
      const hand = JSON.parse(handRow.json);
      if (!hand || !Array.isArray(hand.actions) || hand.actions.length === 0) continue;
      
      // Check if hero is in this hand
      const heroInHand = hand.players?.some(p => p.name === heroName);
      if (!heroInHand) continue;

      stats.hands++;
      stats.totalWon += handRow.heroNet || 0;
      stats.totalBB += handRow.bb || 0;

      // Get preflop actions
      const pre = hand.actions.filter(a => a.street === 'preflop');
      
      // VPIP: voluntary put money in pot (call, raise, bet)
      const isVpipAction = (a) => a.street === 'preflop' && ['call', 'raise', 'bet'].includes(a.type);
      const vpippers = new Set(pre.filter(isVpipAction).map(a => a.player));
      if (vpippers.has(heroName)) stats.VPIP++;

      // PFR: preflop raise tracking
      const acted = new Set();
      const pfrThisHand = new Set();
      let raisesSeen = 0;
      let firstRaiser = null;
      let heroThreeBetRecorded = false;

      for (const action of pre) {
        if (!action?.player) continue;
        const player = action.player;
        const type = String(action.type || '').toLowerCase();
        
        if (DECISION_PRE_ACTIONS.has(type)) {
          acted.add(player);
        }

        // Track raises BEFORE processing hero's action
        const raisesBefore = raisesSeen;

        // Check for 3-bet opportunity when Hero acts (matching hero_metrics.cjs logic)
        if (player === heroName &&
            DECISION_PRE_ACTIONS.has(type) &&
            raisesBefore === 1 &&
            firstRaiser &&
            firstRaiser !== heroName &&
            !heroThreeBetRecorded) {
          stats.ThreeBet_opp++;
          if (type === 'raise') {
            stats.ThreeBet++;
          }
          heroThreeBetRecorded = true;
        }

        if (type === 'raise') {
          if (raisesSeen === 0) {
            firstRaiser = player;
          }
          pfrThisHand.add(player);
          raisesSeen++;
        }
      }

      // PFR opportunity: acted preflop
      if (acted.has(heroName)) {
        stats.PFR_opp++;
        if (pfrThisHand.has(heroName)) stats.PFR++;
      }

      // C-bet on flop
      const preflopAggressor = pre.find(a => a.type === 'raise')?.player || null;
      if (preflopAggressor === heroName) {
        const flop = hand.actions.filter(a => a.street === 'flop');
        if (flop.length > 0) {
          stats.CBetF_opp++;
          const firstBet = flop.find(a => a.type === 'bet');
          if (firstBet && firstBet.player === heroName) {
            stats.CBetF++;
          }
        }
      }

      // WTSD: went to showdown
      const sawFlop = new Set();
      for (const a of hand.actions || []) {
        if (a.street === 'flop' || a.street === 'turn' || a.street === 'river') {
          if (['bet', 'call', 'raise', 'check', 'fold'].includes(a.type)) {
            sawFlop.add(a.player);
          }
        }
      }

      if (sawFlop.has(heroName)) {
        stats.WTSD_opp++;
        
        // Check if hero went to showdown
        const showdownPlayers = new Set();
        for (const act of hand.actions || []) {
          if (act?.player && String(act.type || '').toLowerCase() === 'show') {
            showdownPlayers.add(act.player);
          }
        }
        
        if (showdownPlayers.size === 0 && hand.summary?.seatResults) {
          for (const line of hand.summary.seatResults) {
            if (typeof line !== 'string') continue;
            const match = line.match(/^Seat \d+: ([^(]+?) (?:showed|mucked)/i);
            if (match) showdownPlayers.add(match[1].trim());
          }
        }
        
        if (showdownPlayers.has(heroName)) {
          stats.WTSD++;
        }
      }
    } catch (err) {
      // Skip malformed hands
      continue;
    }
  }

  return stats;
}

/**
 * Aggregate hands by date for timeline charts
 * @param {Array} hands - Array of hand rows
 * @returns {Object} Date-keyed aggregation
 */
function aggregateHandsByDate(hands) {
  const byDate = {};
  
  for (const hand of hands) {
    if (!hand.dateUTC) continue;
    
    const date = hand.dateUTC.split('T')[0]; // YYYY-MM-DD
    if (!byDate[date]) {
      byDate[date] = {
        hands: 0,
        profit: 0,
        bb: 0
      };
    }
    
    byDate[date].hands++;
    byDate[date].profit += hand.heroNet || 0;
    byDate[date].bb += hand.bb || 0;
  }
  
  return byDate;
}

/**
 * Aggregate hands by stake level
 * @param {Array} hands - Array of hand rows
 * @returns {Object} Stake-keyed aggregation
 */
function aggregateHandsByStake(hands) {
  const byStake = {};
  
  for (const hand of hands) {
    const sb = hand.sb || 0;
    const bb = hand.bb || 0;
    const key = `${sb}/${bb}`;
    
    if (!byStake[key]) {
      byStake[key] = {
        sb,
        bb,
        hands: 0,
        profit: 0
      };
    }
    
    byStake[key].hands++;
    byStake[key].profit += hand.heroNet || 0;
  }
  
  return byStake;
}

/**
 * Aggregate hands by table name
 * @param {Array} hands - Array of hand rows
 * @returns {Object} Table-keyed aggregation
 */
function aggregateHandsByTable(hands) {
  const byTable = {};
  
  for (const hand of hands) {
    const table = hand.tableName || 'Unknown';
    
    if (!byTable[table]) {
      byTable[table] = {
        hands: 0,
        profit: 0,
        firstSeen: hand.ts || hand.dateUTC,
        lastSeen: hand.ts || hand.dateUTC
      };
    }
    
    byTable[table].hands++;
    byTable[table].profit += hand.heroNet || 0;
    
    const ts = hand.ts || hand.dateUTC;
    if (ts < byTable[table].firstSeen) byTable[table].firstSeen = ts;
    if (ts > byTable[table].lastSeen) byTable[table].lastSeen = ts;
  }
  
  return byTable;
}

module.exports = {
  aggregateHandsForReports,
  aggregateHandsByDate,
  aggregateHandsByStake,
  aggregateHandsByTable
};
