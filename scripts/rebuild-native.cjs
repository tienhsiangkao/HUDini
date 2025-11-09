#!/usr/bin/env node

/**
 * Rebuild all native modules (currently better-sqlite3) for both
 * the system Node.js runtime and the bundled Electron runtime so we
 * stop hitting ABI mismatches when switching between CLI tools and
 * the desktop app.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');

function readElectronVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const raw = pkg.dependencies?.electron || pkg.devDependencies?.electron;
    if (!raw) return null;
    return String(raw).replace(/^[^\d]*/, ''); // strip ^, ~, etc.
  } catch (err) {
    console.error('[rebuild-native] Failed to read package.json:', err?.message || err);
    return null;
  }
}

function buildSpawnCommand(command, args) {
  const execPath = command && command.endsWith('.js')
    ? process.execPath
    : command;
  const finalArgs = command && command.endsWith('.js')
    ? [command, ...args]
    : args;
  return { execPath, finalArgs };
}

function run(command, args, options = {}) {
  const { execPath, finalArgs } = buildSpawnCommand(command, args);
  const result = spawnSync(execPath, finalArgs, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const cmd = `${command} ${args.join(' ')}`.trim();
    throw new Error(`Command failed (${result.status}): ${cmd}`);
  }
}

function main() {
  const electronVersion = readElectronVersion();
  if (!electronVersion) {
    throw new Error('Unable to determine Electron version from package.json');
  }

  const npmCli = process.env.npm_execpath || (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const npxCli = process.env.npx_execpath || (process.platform === 'win32' ? 'npx.cmd' : 'npx');

  console.log('🛠  Rebuilding better-sqlite3 for Node.js runtime...');
  run(npmCli, ['rebuild', 'better-sqlite3']);

  console.log(`🛠  Rebuilding better-sqlite3 for Electron ${electronVersion}...`);
  run(npxCli, [
    'electron-rebuild',
    '--only',
    'better-sqlite3',
    '--force',
    '--version',
    electronVersion,
  ]);

  console.log('✅ Native modules rebuilt for both Node.js and Electron.');
}

main();
