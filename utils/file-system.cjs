// utils/file-system.cjs
// File system inspection utilities for poker hand history files

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

const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.hh', '.dat', '.json', '.csv', '.gz', '.zip']);
const MAX_PREVIEW_CHARS = 200;
const MAX_FOLDER_SCAN_FILES = 2000;

let parserModulePromise = null;

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
 * Inspect a ZIP archive containing hand history files
 * @param {string} filePath - Path to the ZIP file
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Inspection options
 * @param {string} dirname - Directory for loading parser module
 * @returns {Promise<Object>} Inspection result
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
 * Inspect a hand history file (text, gzip, or ZIP)
 * @param {string} filePath - Path to the file
 * @param {Object} options - Inspection options
 * @param {string} dirname - Directory for loading parser module
 * @returns {Promise<Object>} Inspection result
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
 * Recursively scan a folder for hand history files
 * @param {string} rootPath - Root folder path
 * @param {Object} options - Scan options
 * @param {string} dirname - Directory for loading parser module
 * @returns {Promise<Object>} Scan result
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
