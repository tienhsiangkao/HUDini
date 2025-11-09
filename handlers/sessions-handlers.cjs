// handlers/sessions-handlers.cjs
// Session-related IPC handlers for session detection and analysis

const { logger } = require('../lib/logger.cjs');
const { aggregateHandsForReports } = require('../utils/aggregators.cjs');

function hasCamelCaseSessionColumns(db) {
  try {
    const columns = db.prepare('PRAGMA table_info(sessions)').all();
    return columns.some(col => col.name === 'startTime');
  } catch {
    return false;
  }
}

function deriveHeroNameFromHands(hands = []) {
  for (const hand of hands) {
    if (hand?.hero) {
      return hand.hero;
    }
    if (hand?.json) {
      try {
        const parsed = JSON.parse(hand.json);
        if (parsed?.hero) return parsed.hero;
        const heroPlayer = parsed?.players?.find(player => player?.isHero);
        if (heroPlayer?.name) return heroPlayer.name;
      } catch {
        // Ignore malformed JSON
      }
    }
  }
  return 'Hero';
}

/**
 * Register all session-related IPC handlers
 */
function registerSessionsHandlers(ipcMain, db) {
  logger.info('Registering sessions handlers');

  // sessions:list - Get list of play sessions
  ipcMain.handle('sessions:list', (_event, options = {}) => {
    try {
      const {
        from,
        to,
        stake,
        sessionGapMinutes = 30,
        limit = 50
      } = options || {};

      logger.debug('Fetching sessions list', { from, to, stake, sessionGapMinutes, limit });

      const normalizedLimit = Math.max(1, Math.min(Number(limit) || 50, 500));

      if (hasCamelCaseSessionColumns(db)) {
        const rows = db.prepare(`
          SELECT id, startTime, endTime, hands, totalWon, avgStake
          FROM sessions
          WHERE startTime IS NOT NULL
          ORDER BY startTime DESC
          LIMIT ?
        `).all(normalizedLimit);

        return rows.map(row => {
          const durationMinutes = row.startTime && row.endTime
            ? Math.round((row.endTime - row.startTime) / 60000)
            : 0;

          return {
            id: row.id,
            startTime: row.startTime,
            endTime: row.endTime,
            durationMinutes,
            hands: row.hands || 0,
            totalWon: Number(row.totalWon || 0),
            avgStake: row.avgStake || stake || null
          };
        });
      }

      const clauses = [];
      const params = [];

      let sql = `
        SELECT id, ts, heroNet, sb, bb, tableName
        FROM hands
        WHERE ts IS NOT NULL
      `;

      const fromTs = Date.parse(from);
      if (!Number.isNaN(fromTs)) {
        clauses.push('ts >= ?');
        params.push(fromTs);
      }
      const toTs = Date.parse(to);
      if (!Number.isNaN(toTs)) {
        clauses.push('ts <= ?');
        params.push(toTs);
      }
      if (stake && stake !== 'all') {
        const parts = String(stake).split('/');
        if (parts.length === 2) {
          const sbVal = Number(parts[0]);
          const bbVal = Number(parts[1]);
          if (!Number.isNaN(sbVal) && !Number.isNaN(bbVal)) {
            clauses.push('sb = ? AND bb = ?');
            params.push(sbVal, bbVal);
          }
        }
      }

      if (clauses.length) {
        sql += ' AND ' + clauses.join(' AND ');
      }

      sql += ' ORDER BY ts ASC';

      const hands = db.prepare(sql).all(...params);

      if (hands.length === 0) {
        logger.debug('No hands found for session list');
        return [];
      }

      const sessions = [];
      let currentSession = null;
      const gapMs = sessionGapMinutes * 60 * 1000;

      for (const hand of hands) {
        if (!currentSession) {
          currentSession = {
            startTime: hand.ts,
            endTime: hand.ts,
            handCount: 1,
            netProfit: hand.heroNet || 0,
            stakes: `${hand.sb || 0}/${hand.bb || 0}`,
            hands: [hand],
            bestHand: hand.heroNet || 0,
            worstHand: hand.heroNet || 0
          };
        } else {
          const timeSinceLastHand = hand.ts - currentSession.endTime;

          if (timeSinceLastHand > gapMs) {
            sessions.push(currentSession);
            currentSession = {
              startTime: hand.ts,
              endTime: hand.ts,
              handCount: 1,
              netProfit: hand.heroNet || 0,
              stakes: `${hand.sb || 0}/${hand.bb || 0}`,
              hands: [hand],
              bestHand: hand.heroNet || 0,
              worstHand: hand.heroNet || 0
            };
          } else {
            currentSession.endTime = hand.ts;
            currentSession.handCount++;
            currentSession.netProfit += (hand.heroNet || 0);
            currentSession.hands.push(hand);
            currentSession.bestHand = Math.max(currentSession.bestHand, hand.heroNet || 0);
            currentSession.worstHand = Math.min(currentSession.worstHand, hand.heroNet || 0);
          }
        }
      }

      if (currentSession) {
        sessions.push(currentSession);
      }

      sessions.reverse();

      const normalizedSessions = sessions.slice(0, normalizedLimit).map((session, index) => {
        const durationMs = session.endTime - session.startTime;
        const durationMinutes = Math.round(durationMs / 60000);
        const wonHands = session.hands.filter(h => (h.heroNet || 0) > 0.005).length;
        const lostHands = session.hands.filter(h => (h.heroNet || 0) < -0.005).length;
        const winRate = session.handCount > 0 ? (wonHands / session.handCount * 100) : 0;

        return {
          id: `session_${index + 1}`,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes,
          hands: session.handCount,
          totalWon: Math.round(session.netProfit * 100) / 100,
          avgStake: session.stakes,
          bestHand: Math.round(session.bestHand * 100) / 100,
          worstHand: Math.round(session.worstHand * 100) / 100,
          wonHands,
          lostHands,
          winRate: Math.round(winRate * 10) / 10,
          handsPerHour: durationMinutes > 0 ? Math.round((session.handCount / durationMinutes) * 60) : 0
        };
      });

      logger.info('Sessions list generated', { sessions: normalizedSessions.length });
      return normalizedSessions;
    } catch (err) {
      logger.error('Failed to get sessions list', { error: err.message });
      return [];
    }
  });

  // sessions:detect - Detect sessions with statistics
  ipcMain.handle('sessions:detect', async (_event, params = {}) => {
    try {
      const { sessionGapMinutes = 30 } = params;
      const sessionGapMs = sessionGapMinutes * 60 * 1000;

      const hands = db.prepare(`
        SELECT id, ts, heroNet, bb, sb, tableName, json, hero
        FROM hands
        WHERE sb > 0 AND bb > 0 AND sb <= bb
        ORDER BY ts ASC
      `).all();

      if (hands.length === 0) {
        return { success: true, sessions: [] };
      }

      const heroName = deriveHeroNameFromHands(hands);

      const sessions = [];
      let currentSession = {
        id: 1,
        startTime: hands[0].ts,
        endTime: hands[0].ts,
        hands: [hands[0]],
        handIds: [hands[0].id]
      };

      for (let i = 1; i < hands.length; i++) {
        const hand = hands[i];
        const timeSinceLastHand = hand.ts - currentSession.endTime;

        if (timeSinceLastHand <= sessionGapMs) {
          currentSession.endTime = hand.ts;
          currentSession.hands.push(hand);
          currentSession.handIds.push(hand.id);
        } else {
          sessions.push(currentSession);
          currentSession = {
            id: sessions.length + 1,
            startTime: hand.ts,
            endTime: hand.ts,
            hands: [hand],
            handIds: [hand.id]
          };
        }
      }
      sessions.push(currentSession);

      const sessionsWithStats = sessions.map(session => {
        const { hands: sessionHands, handIds } = session;
        const stats = aggregateHandsForReports(sessionHands, heroName);
        const durationMs = session.endTime - session.startTime;
        const durationMinutes = Math.round(durationMs / 60000);
        const startDate = new Date(session.startTime);
        const endDate = new Date(session.endTime);

        return {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          durationMinutes,
          hands: stats.hands,
          handIds,
          totalWon: Math.round(stats.totalWon * 100) / 100,
          totalBB: stats.totalBB,
          bb_per_100: stats.totalBB > 0 ? Math.round((stats.totalWon * 100 / stats.totalBB) * 100) / 100 : 0,
          vpip: stats.hands > 0 ? Math.round((stats.VPIP / stats.hands) * 100 * 10) / 10 : 0,
          pfr: stats.PFR_opp > 0 ? Math.round((stats.PFR / stats.PFR_opp) * 100 * 10) / 10 : 0,
          threeBet: stats.ThreeBet_opp > 0 ? Math.round((stats.ThreeBet / stats.ThreeBet_opp) * 100 * 10) / 10 : 0,
          cbet: stats.CBetF_opp > 0 ? Math.round((stats.CBetF / stats.CBetF_opp) * 100 * 10) / 10 : 0,
          wtsd: stats.WTSD_opp > 0 ? Math.round((stats.WTSD / stats.WTSD_opp) * 100 * 10) / 10 : 0
        };
      });

      logger.info('Sessions detected', { total: sessionsWithStats.length, hands: hands.length });
      return {
        success: true,
        sessions: sessionsWithStats,
        totalSessions: sessionsWithStats.length,
        totalHands: hands.length,
        sessionGapMinutes
      };
    } catch (err) {
      logger.error('Failed to detect sessions', { error: err.message });
      return { success: false, error: err.message };
    }
  });

  // sessions:details - Get detailed stats for a specific session
  ipcMain.handle('sessions:details', async (_event, payloadOrSessionId, maybeHandIds) => {
    try {
      const request = (payloadOrSessionId && typeof payloadOrSessionId === 'object' && !Array.isArray(payloadOrSessionId))
        ? (payloadOrSessionId || {})
        : { sessionId: payloadOrSessionId, handIds: maybeHandIds };

      const handIds = Array.isArray(request.handIds) ? request.handIds : [];
      const sessionId = request.sessionId ?? null;

      let hands = [];
      if (handIds.length > 0) {
        const placeholders = handIds.map(() => '?').join(',');
        hands = db.prepare(`
          SELECT id, ts, heroNet, bb, sb, tableName, json, hero
          FROM hands
          WHERE id IN (${placeholders})
          ORDER BY ts ASC
        `).all(...handIds);
      }

      if (hands.length === 0) {
        return {
          success: true,
          sessionId,
          stats: {
            hands: 0,
            totalWon: 0,
            bb_per_100: 0,
            VPIP_pct: 0,
            PFR_pct: 0,
            ThreeBet_pct: 0,
            CBetF_pct: 0,
            WTSD_pct: 0
          },
          overview: {
            hands: 0,
            totalWon: 0,
            bb_per_100: 0,
            vpip: 0,
            pfr: 0,
            threeBet: 0,
            cbet: 0,
            wtsd: 0
          },
          positionStats: {},
          byPosition: {},
          stakeBreakdown: [],
          byStake: [],
          handIds: []
        };
      }

      const heroName = deriveHeroNameFromHands(hands);
      const stats = aggregateHandsForReports(hands, heroName);

      const positionStats = {};
      const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

      positions.forEach(pos => {
        const posHands = hands.filter(h => {
          try {
            const hand = JSON.parse(h.json);
            const resolvedHero = hand.hero || heroName;
            if (hand.positions && resolvedHero && hand.positions[resolvedHero]) {
              return hand.positions[resolvedHero] === pos;
            }
            const heroPlayer = hand.players?.find(p => p?.name === resolvedHero);
            return heroPlayer?.position === pos;
          } catch {
            return false;
          }
        });

        if (posHands.length > 0) {
          const posStats = aggregateHandsForReports(posHands, heroName);
          positionStats[pos] = {
            hands: posStats.hands,
            bb_per_100: posStats.totalBB > 0 ? Math.round((posStats.totalWon * 100 / posStats.totalBB) * 100) / 100 : 0,
            totalWon: Math.round(posStats.totalWon * 100) / 100,
            vpip: posStats.hands > 0 ? Math.round((posStats.VPIP / posStats.hands) * 100 * 10) / 10 : 0,
            pfr: posStats.PFR_opp > 0 ? Math.round((posStats.PFR / posStats.PFR_opp) * 100 * 10) / 10 : 0
          };
        }
      });

      const stakeStats = {};
      hands.forEach(h => {
        const stake = `${h.sb}/${h.bb}`;
        if (!stakeStats[stake]) {
          stakeStats[stake] = [];
        }
        stakeStats[stake].push(h);
      });

      const stakeBreakdown = Object.entries(stakeStats).map(([stake, stakeHands]) => {
        const stakeAgg = aggregateHandsForReports(stakeHands, heroName);
        return {
          stake,
          hands: stakeAgg.hands,
          bb_per_100: stakeAgg.totalBB > 0 ? Math.round((stakeAgg.totalWon * 100 / stakeAgg.totalBB) * 100) / 100 : 0,
          totalWon: Math.round(stakeAgg.totalWon * 100) / 100
        };
      }).sort((a, b) => b.hands - a.hands);

      const summary = {
        hands: stats.hands,
        totalWon: Math.round(stats.totalWon * 100) / 100,
        bb_per_100: stats.totalBB > 0 ? Math.round((stats.totalWon * 100 / stats.totalBB) * 100) / 100 : 0,
        VPIP_pct: stats.hands > 0 ? Math.round((stats.VPIP / stats.hands) * 100 * 10) / 10 : 0,
        PFR_pct: stats.PFR_opp > 0 ? Math.round((stats.PFR / stats.PFR_opp) * 100 * 10) / 10 : 0,
        ThreeBet_pct: stats.ThreeBet_opp > 0 ? Math.round((stats.ThreeBet / stats.ThreeBet_opp) * 100 * 10) / 10 : 0,
        CBetF_pct: stats.CBetF_opp > 0 ? Math.round((stats.CBetF / stats.CBetF_opp) * 100 * 10) / 10 : 0,
        WTSD_pct: stats.WTSD_opp > 0 ? Math.round((stats.WTSD / stats.WTSD_opp) * 100 * 10) / 10 : 0
      };

      const overview = {
        hands: summary.hands,
        totalWon: summary.totalWon,
        bb_per_100: summary.bb_per_100,
        vpip: summary.VPIP_pct,
        pfr: summary.PFR_pct,
        threeBet: summary.ThreeBet_pct,
        cbet: summary.CBetF_pct,
        wtsd: summary.WTSD_pct
      };

      logger.info('Session details generated', { sessionId, hands: hands.length });
      return {
        success: true,
        sessionId,
        stats: summary,
        overview,
        positionStats,
        byPosition: positionStats,
        stakeBreakdown,
        byStake: stakeBreakdown,
        handIds: hands.map(h => h.id)
      };
    } catch (err) {
      logger.error('Failed to get session details', { error: err.message, sessionId: payloadOrSessionId });
      return { success: false, error: err.message };
    }
  });

  logger.info('Sessions handlers registered successfully');
}

module.exports = { registerSessionsHandlers };
