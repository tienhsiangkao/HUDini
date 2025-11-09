// handlers/sessions-handlers.cjs
// Session-related IPC handlers for session detection and analysis

const { logger } = require('../lib/logger.cjs');
const { aggregateHandsForReports } = require('../utils/aggregators.cjs');

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
        sessionGapMinutes = 30, // Gap of 30+ minutes = new session
        limit = 50
      } = options || {};
      
      logger.debug('Fetching sessions list', { from, to, stake, sessionGapMinutes, limit });
      
      const clauses = [];
      const params = [];
      
      let sql = `
        SELECT id, ts, heroNet, sb, bb, tableName
        FROM hands
        WHERE ts IS NOT NULL
      `;
      
      // Apply filters
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
      
      const stmt = db.prepare(sql);
      const hands = stmt.all(...params);
      
      if (hands.length === 0) {
        logger.debug('No hands found for session list');
        return [];
      }
      
      // Group hands into sessions
      const sessions = [];
      let currentSession = null;
      const gapMs = sessionGapMinutes * 60 * 1000;
      
      for (const hand of hands) {
        if (!currentSession) {
          // Start first session
          currentSession = {
            sessionId: sessions.length + 1,
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
            // Gap detected - finalize current session and start new one
            sessions.push(currentSession);
            currentSession = {
              sessionId: sessions.length + 1,
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
            // Continue current session
            currentSession.endTime = hand.ts;
            currentSession.handCount++;
            currentSession.netProfit += (hand.heroNet || 0);
            currentSession.hands.push(hand);
            currentSession.bestHand = Math.max(currentSession.bestHand, hand.heroNet || 0);
            currentSession.worstHand = Math.min(currentSession.worstHand, hand.heroNet || 0);
          }
        }
      }
      
      // Add final session
      if (currentSession) {
        sessions.push(currentSession);
      }
      
      // Sort sessions by start time (most recent first)
      sessions.reverse();
      
      logger.debug('Sessions grouped', { total: sessions.length });
      
      // Calculate additional stats and clean up
      const result = sessions.slice(0, limit).map(session => {
        const durationMs = session.endTime - session.startTime;
        const durationMinutes = Math.round(durationMs / 60000);
        const wonHands = session.hands.filter(h => (h.heroNet || 0) > 0.005).length;
        const lostHands = session.hands.filter(h => (h.heroNet || 0) < -0.005).length;
        const winRate = session.handCount > 0 ? (wonHands / session.handCount * 100) : 0;
        
        return {
          sessionId: session.sessionId,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: durationMinutes,
          handCount: session.handCount,
          netProfit: Math.round(session.netProfit * 100) / 100,
          stakes: session.stakes,
          wonHands,
          lostHands,
          winRate: Math.round(winRate * 10) / 10,
          bestHand: Math.round(session.bestHand * 100) / 100,
          worstHand: Math.round(session.worstHand * 100) / 100,
          handsPerHour: durationMinutes > 0 ? Math.round((session.handCount / durationMinutes) * 60) : 0
        };
      });
      
      logger.info('Sessions list generated', { sessions: result.length });
      return result;
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

      // Get all hands ordered by timestamp
      const hands = db.prepare(`
        SELECT id, ts, heroNet, bb, sb, tableName, json
        FROM hands
        WHERE sb > 0 AND bb > 0 AND sb <= bb
        ORDER BY ts ASC
      `).all();

      if (hands.length === 0) {
        return { success: true, sessions: [] };
      }

      // Detect sessions based on time gaps
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
          // Same session
          currentSession.endTime = hand.ts;
          currentSession.hands.push(hand);
          currentSession.handIds.push(hand.id);
        } else {
          // New session - save current and start new
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
      // Don't forget the last session
      sessions.push(currentSession);

      // Calculate statistics for each session
      const sessionsWithStats = sessions.map(session => {
        const { hands: sessionHands, handIds } = session;
        
        // Aggregate using our unified pipeline
        const stats = aggregateHandsForReports(sessionHands);
        
        // Calculate duration
        const durationMs = session.endTime - session.startTime;
        const durationMinutes = Math.round(durationMs / 60000);
        
        // Format dates
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
          
          // Financial stats
          totalWon: Math.round(stats.totalWon * 100) / 100,
          totalBB: stats.totalBB,
          bb_per_100: stats.totalBB > 0 ? Math.round((stats.totalWon * 100 / stats.totalBB) * 100) / 100 : 0,
          
          // Playing stats
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
  ipcMain.handle('sessions:details', async (_event, sessionId, handIds) => {
    try {
      if (!handIds || handIds.length === 0) {
        return { success: false, error: 'No hand IDs provided' };
      }

      // Get all hands for this session
      const placeholders = handIds.map(() => '?').join(',');
      const hands = db.prepare(`
        SELECT id, ts, heroNet, bb, sb, tableName, json
        FROM hands
        WHERE id IN (${placeholders})
        ORDER BY ts ASC
      `).all(...handIds);

      // Aggregate stats
      const stats = aggregateHandsForReports(hands);

      // Group by position
      const positionStats = {};
      const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
      
      positions.forEach(pos => {
        const posHands = hands.filter(h => {
          try {
            const hand = JSON.parse(h.json);
            const heroName = hand.hero;
            return hand.positions?.[heroName] === pos;
          } catch {
            return false;
          }
        });

        if (posHands.length > 0) {
          const posStats = aggregateHandsForReports(posHands);
          positionStats[pos] = {
            hands: posStats.hands,
            bb_per_100: posStats.totalBB > 0 ? Math.round((posStats.totalWon * 100 / posStats.totalBB) * 100) / 100 : 0,
            totalWon: Math.round(posStats.totalWon * 100) / 100,
            vpip: posStats.hands > 0 ? Math.round((posStats.VPIP / posStats.hands) * 100 * 10) / 10 : 0,
            pfr: posStats.PFR_opp > 0 ? Math.round((posStats.PFR / posStats.PFR_opp) * 100 * 10) / 10 : 0
          };
        }
      });

      // Group by stake
      const stakeStats = {};
      hands.forEach(h => {
        const stake = `${h.sb}/${h.bb}`;
        if (!stakeStats[stake]) {
          stakeStats[stake] = [];
        }
        stakeStats[stake].push(h);
      });

      const stakeBreakdown = Object.entries(stakeStats).map(([stake, stakeHands]) => {
        const stakeAgg = aggregateHandsForReports(stakeHands);
        return {
          stake,
          hands: stakeAgg.hands,
          bb_per_100: stakeAgg.totalBB > 0 ? Math.round((stakeAgg.totalWon * 100 / stakeAgg.totalBB) * 100) / 100 : 0,
          totalWon: Math.round(stakeAgg.totalWon * 100) / 100
        };
      }).sort((a, b) => b.hands - a.hands);

      logger.info('Session details generated', { sessionId, hands: hands.length });
      return {
        success: true,
        sessionId,
        overview: {
          hands: stats.hands,
          totalWon: Math.round(stats.totalWon * 100) / 100,
          bb_per_100: stats.totalBB > 0 ? Math.round((stats.totalWon * 100 / stats.totalBB) * 100) / 100 : 0,
          vpip: stats.hands > 0 ? Math.round((stats.VPIP / stats.hands) * 100 * 10) / 10 : 0,
          pfr: stats.PFR_opp > 0 ? Math.round((stats.PFR / stats.PFR_opp) * 100 * 10) / 10 : 0,
          threeBet: stats.ThreeBet_opp > 0 ? Math.round((stats.ThreeBet / stats.ThreeBet_opp) * 100 * 10) / 10 : 0,
          cbet: stats.CBetF_opp > 0 ? Math.round((stats.CBetF / stats.CBetF_opp) * 100 * 10) / 10 : 0,
          wtsd: stats.WTSD_opp > 0 ? Math.round((stats.WTSD / stats.WTSD_opp) * 100 * 10) / 10 : 0
        },
        positionStats,
        stakeBreakdown
      };
    } catch (err) {
      logger.error('Failed to get session details', { error: err.message, sessionId });
      return { success: false, error: err.message };
    }
  });

  logger.info('Sessions handlers registered successfully');
}

module.exports = { registerSessionsHandlers };
