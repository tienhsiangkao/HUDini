// tests/frontend-setup.js
// Setup file for frontend React component tests
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Electron IPC for frontend tests
global.window = global.window || {};
global.window.electron = {
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
    removeListener: vi.fn()
  }
};

// Mock Chart.js if needed
global.window.Chart = global.window.Chart || {
  register: vi.fn(),
  defaults: {}
};

// Suppress console errors in tests (optional)
// global.console.error = vi.fn();
