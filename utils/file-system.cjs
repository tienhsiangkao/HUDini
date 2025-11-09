/**
 * File System Utilities
 * File system inspection utilities for poker hand history files.
 * Provides functions for scanning directories, inspecting individual files,
 * extracting ZIP archives, and detecting hand history formats with preview generation.
 */

const path = require('path');
const fsp = require('fs/promises');
const zlib = require('zlib');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const {
  formatHexSample,
  isGzipBuffer,
  detectEncoding,
  decodeBuffer,
  normalisePreview,
  detectRoom
} = require('./file-parsing.cjs');

// Optional ZIP support
let yauzl = null;
try {
  const requireFn = createRequire(__filename);
  yauzl = requireFn('yauzl');
} catch {}

/**
 * Supported text file extensions for hand history files.
 * @constant
 * @type {Set<string>}
 */
const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.hh', '.dat', '.json', '.csv', '.gz', '.zip']);

/**
 * Maximum characters to include in file content previews.
 * @constant
 * @type {number}
 */
const MAX_PREVIEW_CHARS = 200;

/**
 * Maximum number of files to scan in a single folder operation.
 * @constant
 * @type {number}
 */
const MAX_FOLDER_SCAN_FILES = 2000;

let parserModulePromise = null;

/**
 * Load poker hand history parser module with caching.
 * Dynamically imports parser_starter.js and caches the promise.
 * 
 * @param {string} dirname - Directory path containing parser_starter.js
 * @returns {Promise<object>} Parser module with parsePokerHand function
 * @private
 */
async function loadParserModule(dirname) {
  if (!parserModulePromise) {
    const url = pathToFileURL(path.join(dirname, 'parser_starter.js')).href;
    parserModulePromise = import(url).catch((err) => {
      parserModulePromise = null;
      throw err;
    });
  }
  return parserModulePromise;
}

/**
 * Inspect a ZIP archive containing hand history files.
 * Extracts and analyzes individual files within the archive, optionally parsing hands.
 * 
 * @param {string} filePath - Absolute path to ZIP file
 * @param {Buffer} buffer - ZIP file buffer
 * @param {object} options - Inspection options
 * @param {boolean} [options.parseHands=false] - Whether to parse hands during inspection
 * @param {number} [options.maxFiles=100] - Maximum files to extract from ZIP
 * @param {string} dirname - Directory path for loading parser module
 * @returns {Promise<object>} Inspection result with file count, entries, and hands
 * @property {boolean} success - Whether inspection succeeded
 * @property {string} type - File type ('zip')
 * @property {number} fileCount - Number of files in archive
 * @property {Array<object>} entries - Array of file entries with previews
 * @property {number} [handsFound] - Number of hands parsed (if parseHands=true)
 * 
 * @example
 * const buffer = await fs.promises.readFile('hands.zip');
 * const result = await inspectZip('/path/to/hands.zip', buffer, { parseHands: true }, __dirname);
 * console.log(`Found ${result.handsFound} hands in ${result.fileCount} files`);
 */
async function inspectZip(filePath, buffer, options, dirname) {
  if (!yauzl) {
    return {
      ok: false,
      path: filePath,
      sizeBytes: buffer.length,
      hexFirst: formatHexSample(buffer),
      gzipped: false,
      encoding: 'zip',
      decodedLen: 0,
      room: 'zip',
      decPreview: '',
      hands: 0,
      blank: false,
      parseError: "ZIP support requires the 'yauzl' package (npm install yauzl)",
    };
  }

  const { parseHands = true, maxPreview = MAX_PREVIEW_CHARS } = options || {};
  
  return new Promise((resolve) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, async (err, zip) => {
      if (err || !zip) {
        return resolve({
          ok: false,
          path: filePath,
          sizeBytes: buffer.length,
          hexFirst: formatHexSample(buffer),
          gzipped: false,
          encoding: 'zip',
          decodedLen: 0,
          room: 'zip',
          decPreview: '',
          hands: 0,
          blank: false,
          parseError: err?.message || String(err || 'open zip failed'),
        });
      }

      let parseError = null;
      let parseHandsFn = null;
      
      if (parseHands) {
        try {
          const mod = await loadParserModule(dirname);
          const fn = mod?.parseHandsText || mod?.default?.parseHandsText;
          if (typeof fn === 'function') parseHandsFn = fn;
          else parseError = 'parseHandsText() missing';
        } catch (e) {
          parseError = e?.message || String(e);
        }
      }

      const entryPreviews = [];
      let aggregatedText = '';
      let totalHands = 0;
      const MAX_BYTES = 1_500_000;

      const collectEntry = (entry, text) => {
        entryPreviews.push({
          name: entry.fileName,
          size: entry.uncompressedSize,
          preview: normalisePreview(text, maxPreview),
        });
        if (aggregatedText.length < MAX_BYTES) {
          aggregatedText += text.slice(0, MAX_BYTES - aggregatedText.length);
        }
      };

      const finish = async () => {
        let room = 'unknown';
        if (aggregatedText) {
          room = detectRoom(aggregatedText);
        }
        resolve({
          ok: true,
          path: filePath,
          sizeBytes: buffer.length,
          hexFirst: formatHexSample(buffer),
          gzipped: false,
          encoding: 'zip',
          decodedLen: aggregatedText.length,
          room,
          decPreview: normalisePreview(aggregatedText, maxPreview),
          hands: parseHandsFn ? totalHands : 0,
          blank: !aggregatedText.trim().length,
          parseError,
          zipEntries: entryPreviews,
        });
      };

      const handleEntry = (entry) => {
        if (/\/$/.test(entry.fileName)) { 
          zip.readEntry(); 
          return; 
        }
        
        const ext = path.extname(entry.fileName).toLowerCase();
        if (!['.txt', '.log', '.hh'].includes(ext)) { 
          zip.readEntry(); 
          return; 
        }

        zip.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) { 
            zip.readEntry(); 
            return; 
          }
          
          const chunks = [];
          stream.on('data', (c) => chunks.push(c));
          stream.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            collectEntry(entry, text);
            
            if (parseHandsFn) {
              try {
                const arr = parseHandsFn(text) || [];
                totalHands += Array.isArray(arr) ? arr.length : 0;
              } catch (entryErr) {
                parseError = parseError || entryErr?.message || String(entryErr);
              }
            }
            zip.readEntry();
          });
        });
      };

      zip.on('entry', handleEntry);
      zip.on('end', () => finish());
      zip.on('error', (zipErr) => {
        resolve({
          ok: false,
          path: filePath,
          sizeBytes: buffer.length,
          hexFirst: formatHexSample(buffer),
          gzipped: false,
          encoding: 'zip',
          decodedLen: 0,
          room: 'zip',
          decPreview: '',
          hands: 0,
          blank: false,
          parseError: zipErr?.message || String(zipErr),
        });
      });

      zip.readEntry();
    });
  });
}

/**
 * Inspect a hand history file (text, gzip, or ZIP) with optional parsing.
 * Handles gzip-compressed files, detects poker room, generates text preview.
 * Automatically delegates to inspectZip for ZIP archives.
 * 
 * @param {string} filePath - Absolute path to file
 * @param {object} [options={}] - Inspection options
 * @param {boolean} [options.parseHands=true] - Whether to parse hands during inspection
 * @param {number} [options.maxPreview=200] - Maximum characters for text preview
 * @param {string} dirname - Directory path for loading parser module
 * @returns {Promise<object>} Inspection result with metadata and optional parsed hands
 * @property {boolean} ok - Whether inspection succeeded
 * @property {string} path - File path
 * @property {number} sizeBytes - File size in bytes
 * @property {boolean} gzipped - Whether file was gzip-compressed
 * @property {string} encoding - Detected text encoding
 * @property {string} preview - Text content preview
 * @property {string} detectedRoom - Poker room identifier
 * @property {number} [handsFound] - Number of hands parsed (if parseHands=true)
 * @property {Array<object>} [hands] - Parsed hand objects (if parseHands=true)
 * 
 * @example
 * const result = await inspectFile('/path/to/hands.txt', { parseHands: true }, __dirname);
 * console.log(`File: ${result.path}`);
 * console.log(`Room: ${result.detectedRoom}`);
 * console.log(`Hands: ${result.handsFound}`);
 */
async function inspectFile(filePath, options = {}, dirname) {
  const { parseHands = true, maxPreview = MAX_PREVIEW_CHARS } = options;
  
  const buffer = await fsp.readFile(filePath);
  const sizeBytes = buffer.length;
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.zip') {
    return inspectZip(filePath, buffer, { parseHands, maxPreview }, dirname);
  }

  const gzipped = isGzipBuffer(buffer);
  let decodedBuffer = buffer;
  let gzError = null;

  if (gzipped) {
    try {
      decodedBuffer = zlib.gunzipSync(buffer);
    } catch (err) {
      gzError = err?.message || String(err);
      decodedBuffer = Buffer.alloc(0);
    }
  }

  const encoding = detectEncoding(decodedBuffer);
  const text = decodeBuffer(decodedBuffer, encoding);
  const decodedLen = text.length;
  const blank = !text.trim().length;
  const decPreview = normalisePreview(text, maxPreview);

  let hands = null;
  let parseError = null;

  if (parseHands && text) {
    try {
      const mod = await loadParserModule(dirname);
      const parseHandsText = mod?.parseHandsText || mod?.default?.parseHandsText;
      if (typeof parseHandsText === 'function') {
        const arr = parseHandsText(text) || [];
        hands = Array.isArray(arr) ? arr.length : 0;
      } else {
        parseError = 'parseHandsText() missing';
        hands = 0;
      }
    } catch (err) {
      parseError = err?.message || String(err);
      hands = 0;
    }
  }

  return {
    ok: true,
    path: filePath,
    sizeBytes,
    hexFirst: formatHexSample(buffer),
    gzipped,
    gzError,
    encoding,
    decodedLen,
    room: detectRoom(text),
    decPreview,
    hands,
    blank,
    parseError,
  };
}

/**
 * Recursively scan a folder for hand history files with filtering and sampling.
 * Identifies text files, gzip archives, and provides preview samples of discovered files.
 * Limits total files scanned to prevent performance issues with large directories.
 * 
 * @param {string} rootPath - Absolute path to root folder to scan
 * @param {object} [options={}] - Scan options
 * @param {number} [options.sampleLimit=5] - Maximum number of sample file previews to include
 * @param {number} [options.inspectLimit=200] - Maximum number of files to inspect in detail
 * @param {string} dirname - Directory path for loading parser module
 * @returns {Promise<object>} Scan result with file statistics and samples
 * @property {boolean} ok - Whether scan succeeded
 * @property {string} root - Root folder path scanned
 * @property {number} totalFiles - Total files discovered
 * @property {number} zeroByte - Count of zero-byte files
 * @property {number} blankText - Count of blank text files
 * @property {number} gzCount - Count of gzip-compressed files
 * @property {number} textLike - Count of text-like files
 * @property {Array<object>} samples - Sample file inspection results
 * 
 * @example
 * const result = await scanFolder('/path/to/hands', { sampleLimit: 10 }, __dirname);
 * console.log(`Scanned ${result.totalFiles} files`);
 * console.log(`Found ${result.textLike} hand history files`);
 * result.samples.forEach(sample => {
 *   console.log(`- ${sample.path}: ${sample.detectedRoom}`);
 * });
 */
async function scanFolder(rootPath, options = {}, dirname) {
  const { sampleLimit = 5, inspectLimit = 200 } = options;
  
  const result = {
    ok: true,
    root: rootPath,
    totalFiles: 0,
    zeroByte: 0,
    blankText: 0,
    gzCount: 0,
    textLike: 0,
    samples: [],
  };

  const stack = [rootPath];
  let inspected = 0;

  while (stack.length) {
    const current = stack.pop();
    let entries;
    
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      
      if (!entry.isFile()) continue;
      
      result.totalFiles++;
      
      let stats;
      try {
        stats = await fsp.stat(full);
      } catch {
        continue;
      }

      if (stats.size === 0) result.zeroByte++;

      const ext = path.extname(entry.name).toLowerCase();
      const textLikely = TEXT_EXTENSIONS.has(ext);
      
      if (textLikely) result.textLike++;

      if (textLikely && inspected < inspectLimit) {
        inspected++;
        try {
          const detail = await inspectFile(full, { parseHands: false, maxPreview: 160 }, dirname);
          if (detail.gzipped) result.gzCount++;
          if (detail.blank) result.blankText++;
          
          if (result.samples.length < sampleLimit) {
            result.samples.push({
              path: path.relative(rootPath, full) || entry.name,
              encoding: detail.encoding,
              gzipped: !!detail.gzipped,
              room: detail.room,
              preview: detail.decPreview,
            });
          }
        } catch (err) {
          if (result.samples.length < sampleLimit) {
            result.samples.push({
              path: path.relative(rootPath, full) || entry.name,
              error: err?.message || String(err),
            });
          }
        }
      } else if (ext === '.gz') {
        result.gzCount++;
      }

      if (result.totalFiles >= MAX_FOLDER_SCAN_FILES) {
        result.note = `Stopped after ${MAX_FOLDER_SCAN_FILES} files (limit).`;
        return result;
      }
    }
  }

  if (inspected >= inspectLimit) {
    result.note = `Inspected first ${inspectLimit} text-like files (limit).`;
  }

  return result;
}

module.exports = {
  inspectFile,
  inspectZip,
  scanFolder,
  loadParserModule,
  TEXT_EXTENSIONS,
  MAX_PREVIEW_CHARS,
  MAX_FOLDER_SCAN_FILES,
};
