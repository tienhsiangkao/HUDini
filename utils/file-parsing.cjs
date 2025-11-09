/**
 * File Parsing Utilities
 * Utilities for detecting and decoding various file formats and poker room types.
 * Handles encoding detection (UTF-8, UTF-16), gzip decompression, poker room identification,
 * and hand history validation for multiple poker sites (PokerStars, GGPoker, etc.).
 */

/**
 * Maximum characters to include in text previews.
 * @constant
 * @type {number}
 */
const MAX_PREVIEW_CHARS = 500;

/**
 * Format buffer as hexadecimal string sample for debugging.
 * Useful for inspecting binary file formats and encoding issues.
 * 
 * @param {Buffer} buffer - Buffer to format as hex string
 * @param {number} [bytes=32] - Number of bytes to include in sample
 * @returns {string} Space-separated hex string (e.g., "1f 8b 08 00...")
 * 
 * @example
 * const buffer = Buffer.from([0x1f, 0x8b, 0x08]);
 * console.log(formatHexSample(buffer)); // "1f 8b 08"
 */
function formatHexSample(buffer, bytes = 32) {
  if (!buffer || !buffer.length) return '';
  const slice = buffer.subarray(0, Math.min(bytes, buffer.length));
  return Array.from(slice).map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

/**
 * Check if buffer contains gzip-compressed data by inspecting magic bytes.
 * Gzip files start with magic bytes 0x1f 0x8b.
 * 
 * @param {Buffer} buffer - Buffer to inspect
 * @returns {boolean} True if buffer starts with gzip magic bytes
 * 
 * @example
 * const gzipBuffer = fs.readFileSync('archive.gz');
 * if (isGzipBuffer(gzipBuffer)) {
 *   console.log('File is gzip-compressed');
 * }
 */
function isGzipBuffer(buffer) {
  return buffer && buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/**
 * Detect text encoding from buffer Byte Order Mark (BOM).
 * Supports UTF-8, UTF-16 LE (Little Endian), and UTF-16 BE (Big Endian).
 * 
 * @param {Buffer} buffer - Buffer to analyze for BOM
 * @returns {string} Detected encoding: 'utf-8', 'utf-16le', or 'utf-16be'
 * 
 * @example
 * const buffer = fs.readFileSync('hand_history.txt');
 * const encoding = detectEncoding(buffer);
 * const text = buffer.toString(encoding);
 */
function detectEncoding(buffer) {
  if (!buffer || buffer.length < 2) return 'utf-8';
  
  // UTF-16 BE (Big Endian)
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return 'utf-16be';
  
  // UTF-16 LE (Little Endian)
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return 'utf-16le';
  
  // UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8';
  }
  
  return 'utf-8';
}

/**
 * Decode buffer with specified encoding, with fallback to UTF-8
 * @param {Buffer} buffer - Buffer to decode
 * @param {string} encoding - Encoding to use ('utf-16le', 'utf-16be', 'utf-8')
 * @returns {string} Decoded text
 */
function decodeBuffer(buffer, encoding) {
  if (!buffer) return '';
  
  // Map to Node.js encoding names
  const enc = encoding === 'utf-16le' ? 'utf16le' 
            : encoding === 'utf-16be' ? 'utf16be' 
            : 'utf8';
  
  try {
    let text = buffer.toString(enc);
    // Remove BOM if present
    if (text.startsWith('\ufeff')) text = text.slice(1);
    return text;
  } catch {
    // Fallback to UTF-8
    try {
      let text = buffer.toString('utf8');
      if (text.startsWith('\ufeff')) text = text.slice(1);
      return text;
    } catch {
      return '';
    }
  }
}

/**
 * Normalize text preview by collapsing whitespace and trimming to maximum length.
 * Useful for creating clean text previews of hand history files.
 * 
 * @param {string} text - Text to normalize
 * @param {number} [maxLen=500] - Maximum character length for preview
 * @returns {string} Normalized text with collapsed whitespace and trimmed to max length
 * 
 * @example
 * const preview = normalisePreview('Hand   #123\n\nTable:  NL25');
 * console.log(preview); // "Hand #123 Table: NL25"
 */
function normalisePreview(text, maxLen = MAX_PREVIEW_CHARS) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/**
 * Detect poker room/site from hand history text by pattern matching.
 * Identifies PokerStars, GGPoker, Ignition, Bovada, PartyPoker, 888poker, Winamax formats.
 * 
 * @param {string} text - Hand history text content
 * @returns {string} Poker room identifier: 'PokerStars', 'GG Rush & Cash', 'Ignition/Bovada', etc., or 'unknown'
 * 
 * @example
 * const text = fs.readFileSync('hand.txt', 'utf8');
 * const room = detectRoom(text);
 * console.log(`Detected poker room: ${room}`);
 */
function detectRoom(text) {
  if (!text) return 'unknown';
  
  // Check for specific poker room patterns
  if (/PokerStars Hand #/i.test(text)) return 'PokerStars';
  if (/Ignition Hand #/i.test(text)) return 'Ignition/Bovada';
  if (/Bovada Hand #/i.test(text)) return 'Bovada';
  if (/PartyPoker Hand #/i.test(text)) return 'PartyPoker';
  if (/888poker Hand #/i.test(text)) return '888poker';
  if (/Winamax Poker/i.test(text)) return 'Winamax';
  
  // GGPoker patterns
  if (/Rush ?& ?Cash/i.test(text)) return 'GG Rush & Cash';
  if (/Poker Hand\s+#/i.test(text)) return 'GG/PokerStars format';
  
  return 'unknown';
}

/**
 * Check if text appears to be a valid hand history by looking for common patterns.
 * Validates presence of hand number, player seat assignments, and action keywords.
 * 
 * @param {string} text - Text to validate as hand history
 * @returns {boolean} True if text contains hand history patterns
 * 
 * @example
 * const text = fs.readFileSync('suspected_hand.txt', 'utf8');
 * if (isValidHandHistory(text)) {
 *   console.log('Valid hand history file');
 * } else {
 *   console.log('Not a hand history');
 * }
 */
function isValidHandHistory(text) {
  if (!text || text.length < 50) return false;
  
  // Check for common hand history markers
  const markers = [
    /Hand #/i,
    /\*\*\*\*\* ?Poker/i,
    /Table ['"].*?['"]/i,
    /Seat \d+:/i,
    /Button is seat #?\d+/i,
    /posts? (small|big) blind/i
  ];
  
  return markers.some(pattern => pattern.test(text));
}

/**
 * Extract file extension from filename
 * @param {string} filename - Filename to extract extension from
 * @returns {string} Lowercase extension without dot
 */
function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Check if file extension is a supported hand history format.
 * Supported extensions: txt, hh, log, gz, zip.
 * 
 * @param {string} filename - Filename to check
 * @returns {boolean} True if file extension is supported for hand history parsing
 * 
 * @example
 * isSupportedHandHistoryFile('hands.txt'); // true
 * isSupportedHandHistoryFile('archive.gz'); // true
 * isSupportedHandHistoryFile('document.pdf'); // false
 */
function isSupportedHandHistoryFile(filename) {
  const ext = getFileExtension(filename);
  const supportedExtensions = ['txt', 'hh', 'log', 'gz', 'zip'];
  return supportedExtensions.includes(ext);
}

/**
 * Sanitize filename for safe filesystem operations by removing dangerous characters.
 * Removes path separators, wildcards, control characters, and limits length to 255 chars.
 * 
 * @param {string} filename - Filename to sanitize
 * @returns {string} Safe filename with dangerous characters replaced by underscores
 * 
 * @example
 * sanitizeFilename('hand<>history?.txt'); // 'hand__history_.txt'
 * sanitizeFilename('../../../etc/passwd'); // '______etc_passwd'
 * sanitizeFilename('.hidden'); // 'hidden'
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'unnamed';
  
  // Remove dangerous characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .slice(0, 255); // Limit length
}

module.exports = {
  formatHexSample,
  isGzipBuffer,
  detectEncoding,
  decodeBuffer,
  normalisePreview,
  detectRoom,
  isValidHandHistory,
  getFileExtension,
  isSupportedHandHistoryFile,
  sanitizeFilename,
  MAX_PREVIEW_CHARS
};
