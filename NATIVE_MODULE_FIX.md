# Native Module Build Issue - better-sqlite3

## Problem

The `better-sqlite3` native module requires different NODE_MODULE_VERSION depending on environment:
- **Electron 38.6.0**: Requires NODE_MODULE_VERSION **139**
- **Node.js v22.x**: Requires NODE_MODULE_VERSION **127**

## Solution

We maintain separate rebuild commands:

```bash
# For running the Electron app:
npm run rebuild:electron    # Rebuilds for Electron (NODE_MODULE_VERSION 139)

# For running tests with Node.js:
npm run rebuild:node        # Rebuilds for Node.js (NODE_MODULE_VERSION 127)
```

## Automated

The scripts are now automated:
- `npm start` - Automatically rebuilds for Electron before starting
- `npm test` - Uses Node.js build (run `npm run rebuild:node` first if needed)

## Manual Fix

If you encounter errors:

### For Electron app (`npm start`):
```bash
npx electron-rebuild -f -w better-sqlite3
```

### For Tests (`npm test`):
```bash
npm rebuild better-sqlite3
```

## Why This Happens

Native Node.js modules (like better-sqlite3) are compiled C++ bindings. They must match the exact V8 version of the runtime:
- Electron bundles its own Node.js version (different from system Node.js)
- Tests run on system Node.js
- Each requires a separate build

## Alternative Solutions

1. **Use electron-rebuild in postinstall** (auto-rebuilds on npm install)
2. **Use @electron/rebuild** package (newer rebuild tool)
3. **Switch to better-sqlite3-multiple-ciphers** (pre-built binaries)
4. **Use separate test database** (like SQLite WASM for tests)

For now, we use manual rebuild scripts for explicit control.
