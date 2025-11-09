/**
 * Metrics Utilities
 * Database query and calculation utilities for player statistics
 */

const { computeHeroHandMetrics } = require('../lib/hero_metrics.cjs');

/**
 * Fetch all hands from database for metrics calculation
 * @param {Database} database - SQLite database instance
 * @returns {Array} Array of hand rows
 */
function fetchHandsForMetrics(database) {
  return database.prepare(`
    SELECT id, json, sb, bb, ts, heroNet, dateUTC, tableName
    FROM hands
    ORDER BY ts ASC NULLS LAST, rowid ASC
  `).all();
}

/**
 * Compute aggregate statistics across multiple hands
 * @param {Array} rows - Array of hand rows from database
 * @returns {Object} Aggregated statistics with percentages
 */
function computeHeroAggregatePercents(rows) {
  const totals = {
    pfr: 0,
    pfrOpp: 0,
    threeBet: 0,
    threeBetOpp: 0,
    wtsd: 0,
    wtsdOpp: 0,
    cbetF: 0,
    cbetF_opp: 0,
    cbetT: 0,
    cbetT_opp: 0,
    cbetR: 0,
    cbetR_opp: 0,
  };
  
  for (const row of rows) {
    if (!row?.json) continue;
    
    let hand;
    try {
      hand = JSON.parse(row.json);
    } catch {
      continue;
    }
    
    const metrics = computeHeroHandMetrics(hand, row);
    if (!metrics) continue;
    
    totals.pfr += metrics.pfr || 0;
    totals.pfrOpp += metrics.pfrOpp || 0;
    totals.threeBet += metrics.threeBet || 0;
    totals.threeBetOpp += metrics.threeBetOpp || 0;
    totals.wtsd += metrics.wtsd || 0;
    totals.wtsdOpp += metrics.wtsdOpp || 0;
    totals.cbetF += metrics.cbetF || 0;
    totals.cbetF_opp += metrics.cbetF_opp || 0;
    totals.cbetT += metrics.cbetT || 0;
    totals.cbetT_opp += metrics.cbetT_opp || 0;
    totals.cbetR += metrics.cbetR || 0;
    totals.cbetR_opp += metrics.cbetR_opp || 0;
  }
  
  const pct = (num, den) => {
    if (!den) return 0;
    return Number(((num / den) * 100).toFixed(1));
  };
  
  return {
    pfr: pct(totals.pfr, totals.pfrOpp),
    pfrOpp: totals.pfrOpp,
    threeBet: pct(totals.threeBet, totals.threeBetOpp),
    threeBetOpp: totals.threeBetOpp,
    wtsd: pct(totals.wtsd, totals.wtsdOpp),
    wtsdOpp: totals.wtsdOpp,
    cbetF: pct(totals.cbetF, totals.cbetF_opp),
    cbetFOpp: totals.cbetF_opp,
    cbetT: pct(totals.cbetT, totals.cbetT_opp),
    cbetTOpp: totals.cbetT_opp,
    cbetR: pct(totals.cbetR, totals.cbetR_opp),
    cbetROpp: totals.cbetR_opp,
  };
}

/**
 * Fetch the most recent hero name from database
 * @param {Database} db - SQLite database instance
 * @returns {string|null} Hero name or null if not found
 */
function fetchLatestHeroName(db) {
  try {
    const latest = db.prepare(`
      SELECT hero
      FROM hands
      WHERE hero IS NOT NULL AND hero != ''
      ORDER BY ts DESC NULLS LAST, rowid DESC
      LIMIT 1
    `).get();
    
    if (latest?.hero) return latest.hero;
    
    // Fallback to any hero name if no timestamp ordering
    const fallback = db.prepare(`
      SELECT hero
      FROM hands
      WHERE hero IS NOT NULL AND hero != ''
      LIMIT 1
    `).get();
    
    return fallback?.hero || null;
  } catch {
    return null;
  }
}

/**
 * Calculate percentage with proper handling of edge cases
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {number} Percentage
 */
function calculatePercentage(numerator, denominator, decimals = 1) {
  if (!denominator || denominator === 0) return 0;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  
  const percentage = (numerator / denominator) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * Format stake label (e.g., "$0.50/$1.00" or "$1/$2")
 * @param {number} sb - Small blind
 * @param {number} bb - Big blind
 * @returns {string} Formatted stake label
 */
function formatStakeLabel(sb, bb) {
  if (!Number.isFinite(sb) || !Number.isFinite(bb)) return 'Unknown';
  
  // Format as currency
  const format = (val) => {
    if (val >= 1) return `$${val}`;
    return `$${val.toFixed(2)}`;
  };
  
  return `${format(sb)}/${format(bb)}`;
}

/**
 * Extract metrics from hand JSON string
 * @param {string} jsonStr - JSON string of hand data
 * @param {string} heroName - Hero player name
 * @returns {Object|null} Extracted metrics or null
 */
function extractHandMetrics(jsonStr, heroName = 'Hero') {
  if (!jsonStr) return null;
  
  try {
    const hand = JSON.parse(jsonStr);
    const row = { hero: heroName };
    return computeHeroHandMetrics(hand, row);
  } catch (error) {
    return null;
  }
}

module.exports = {
  fetchHandsForMetrics,
  computeHeroAggregatePercents,
  fetchLatestHeroName,
  calculatePercentage,
  formatStakeLabel,
  extractHandMetrics
};
