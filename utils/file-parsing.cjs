/**
 * File Parsing Utilities
 * Utilities for detecting and decoding various file formats and poker room types
 */

const MAX_PREVIEW_CHARS = 500;

/**
 * Format buffer as hex string sample
 * @param {Buffer} buffer - Buffer to format
 * @param {number} bytes - Number of bytes to include (default: 32)
 * @returns {string} Hex string representation
 */
function formatHexSample(buffer, bytes = 32) {
  if (!buffer || !buffer.length) return '';
  const slice = buffer.subarray(0, Math.min(bytes, buffer.length));
  return Array.from(slice).map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

/**
 * Check if buffer is gzip-compressed
 * @param {Buffer} buffer - Buffer to check
 * @returns {boolean} True if gzip magic bytes present
 */
function isGzipBuffer(buffer) {
  return buffer && buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/**
 * Detect text encoding from buffer BOM (Byte Order Mark)
 * @param {Buffer} buffer - Buffer to detect encoding from
 * @returns {string} Detected encoding ('utf-8', 'utf-16le', 'utf-16be')
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
 * Normalize text preview by collapsing whitespace and trimming
 * @param {string} text - Text to normalize
 * @param {number} maxLen - Maximum length (default: 500)
 * @returns {string} Normalized text preview
 */
function normalisePreview(text, maxLen = MAX_PREVIEW_CHARS) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/**
 * Detect poker room from hand history text
 * @param {string} text - Hand history text
 * @returns {string} Detected room identifier
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
 * Check if text appears to be a valid hand history
 * @param {string} text - Text to validate
 * @returns {boolean} True if text looks like a hand history
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
 * Check if file extension is supported hand history format
 * @param {string} filename - Filename to check
 * @returns {boolean} True if extension is supported
 */
function isSupportedHandHistoryFile(filename) {
  const ext = getFileExtension(filename);
  const supportedExtensions = ['txt', 'hh', 'log', 'gz', 'zip'];
  return supportedExtensions.includes(ext);
}

/**
 * Sanitize filename for safe filesystem operations
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
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
