#!/usr/bin/env node

/**
 * Simple repository hygiene guard.
 * - Flags tracked files that exceed the configured size threshold.
 * - Flags tracked artefacts that should remain locally generated.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const SIZE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB

const DISALLOWED_PATTERNS = [
  /^node_modules\//i,
  /^tmp\//i,
  /^tmp_import\//i,
  /\.db$/i,
  /\.traineddata$/i,
];

function listTrackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.trim() : 'unknown error';
    console.error(`Failed to enumerate tracked files: ${stderr}`);
    process.exit(1);
  }
  return result.stdout.split('\u0000').filter(Boolean);
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

const trackedFiles = listTrackedFiles();
const violations = [];

for (const relativePath of trackedFiles) {
  const absolutePath = path.join(repoRoot, relativePath);
  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch {
    continue;
  }
  if (!stat.isFile()) continue;

  if (stat.size > SIZE_LIMIT_BYTES) {
    violations.push({
      path: relativePath,
      reason: `exceeds ${formatSize(SIZE_LIMIT_BYTES)} (actual ${formatSize(stat.size)})`,
    });
  }

  if (DISALLOWED_PATTERNS.some((pattern) => pattern.test(relativePath))) {
    violations.push({
      path: relativePath,
      reason: 'matches repository ignore policy',
    });
  }
}

if (!violations.length) {
  console.log('✅ Repository hygiene check passed.');
  process.exit(0);
}

console.error('❌ Repository hygiene check failed:');
for (const violation of violations) {
  console.error(`  - ${violation.path}: ${violation.reason}`);
}
console.error('\nRemove or untrack the files above, then re-run `npm run lint:repo`.');
process.exit(1);
