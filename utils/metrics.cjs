/**
 * Metrics Utilities
 * Database query and calculation utilities for player statistics.
 * Provides functions for computing VPIP, PFR, 3-bet, C-bet, WTSD percentages
 * and other poker statistics from hand data.
 */

const { computeHeroHandMetrics } = require('../lib/hero_metrics.cjs');

/**
 * Fetch all hands from database ordered by timestamp for metrics calculation.
 * Returns hands with JSON data, stakes, timestamps, and net profit.
 * 
 * @param {Database} database - better-sqlite3 database instance
 * @returns {Array<object>} Array of hand objects with id, json, sb, bb, ts, heroNet, dateUTC, tableName
 * 
 * @example
 * const hands = fetchHandsForMetrics(db);
 * console.log(`Fetched ${hands.length} hands for analysis`);
 */
function fetchHandsForMetrics(database) {
  return database.prepare(`
    SELECT id, json, sb, bb, ts, heroNet, dateUTC, tableName
    FROM hands
    ORDER BY ts ASC NULLS LAST, rowid ASC
  `).all();
}

/**
 * Compute hero aggregate percentage statistics (PFR, 3-bet, WTSD, C-bet) from multiple hands.
 * Calculates percentages by summing opportunities and actions across all hands.
 * 
 * @param {Array<object>} rows - Array of hand objects with json field
 * @returns {object} Aggregate statistics object
 * @property {number} pfr - Pre-flop raise percentage
 * @property {number} pfrOpp - Number of PFR opportunities
 * @property {number} threeBet - 3-bet percentage
 * @property {number} threeBetOpp - Number of 3-bet opportunities
 * @property {number} wtsd - Went to showdown percentage
 * @property {number} wtsdOpp - Number of showdown opportunities
 * @property {number} cbetF - Flop c-bet percentage
 * @property {number} cbetFOpp - Flop c-bet opportunities
 * @property {number} cbetT - Turn c-bet percentage
 * @property {number} cbetTOpp - Turn c-bet opportunities
 * @property {number} cbetR - River c-bet percentage
 * @property {number} cbetROpp - River c-bet opportunities
 * 
 * @example
 * const hands = fetchHandsForMetrics(db);
 * const stats = computeHeroAggregatePercents(hands);
 * console.log(`PFR: ${stats.pfr}% (${stats.pfrOpp} opportunities)`);
 * console.log(`3-bet: ${stats.threeBet}% (${stats.threeBetOpp} opportunities)`);
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
 * Fetch the most recent hero player name from database.
 * Looks for latest hand with non-null hero field, falls back to any hand with hero.
 * 
 * @param {Database} db - better-sqlite3 database instance
 * @returns {string|null} Hero player name or null if not found
 * 
 * @example
 * const heroName = fetchLatestHeroName(db);
 * console.log(`Hero player: ${heroName || 'Not found'}`);
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
 * Calculate percentage with proper handling of edge cases and rounding.
 * Returns 0 for division by zero or non-finite inputs.
 * 
 * @param {number} numerator - The numerator value
 * @param {number} denominator - The denominator value
 * @param {number} [decimals=1] - Number of decimal places to round to
 * @returns {number} Calculated percentage rounded to specified decimals
 * 
 * @example
 * calculatePercentage(25, 100); // 25.0
 * calculatePercentage(1, 3, 2); // 33.33
 * calculatePercentage(10, 0); // 0 (handles division by zero)
 */
function calculatePercentage(numerator, denominator, decimals = 1) {
  if (!denominator || denominator === 0) return 0;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  
  const percentage = (numerator / denominator) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * Format stake label with currency symbols (e.g., "$0.50/$1.00" or "$1/$2").
 * Shows two decimal places for values < $1, whole numbers for values >= $1.
 * 
 * @param {number} sb - Small blind amount
 * @param {number} bb - Big blind amount
 * @returns {string} Formatted stake label or 'Unknown' if invalid
 * 
 * @example
 * formatStakeLabel(0.5, 1); // "$0.50/$1"
 * formatStakeLabel(1, 2); // "$1/$2"
 * formatStakeLabel(0.25, 0.5); // "$0.25/$0.50"
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
 * Extract poker metrics from hand JSON string using computeHeroHandMetrics.
 * Parses JSON and computes VPIP, PFR, 3-bet, C-bet, and other statistics.
 * 
 * @param {string} jsonStr - JSON string containing hand data
 * @param {string} [heroName='Hero'] - Hero player name for metric calculation
 * @returns {object|null} Metrics object with VPIP, PFR, 3-bet, etc., or null if parsing fails
 * 
 * @example
 * const metrics = extractHandMetrics(hand.json, 'PlayerName');
 * if (metrics) {
 *   console.log(`VPIP: ${metrics.vpip}, PFR: ${metrics.pfr}`);
 * }
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
