// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  
  test: {
    globals: true,
    
    // Support both Node.js (backend) and jsdom (frontend) environments
    // Tests can override with @vitest-environment comment
    environment: 'node',
    
    // Setup files
    setupFiles: ['./tests/frontend-setup.js'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'renderer/vendor/**',
        'renderer/renderer_umd.js', // Exclude old monolith
        '**/*.test.js',
        '**/*.test.jsx',
        '**/*.config.js',
        'scripts/**',
        'temp_check.txt',
        'tests/**',
      ],
      include: [
        'handlers/**/*.cjs',
        'lib/**/*.cjs',
        'utils/**/*.cjs',
        'renderer/src/**/*.{js,jsx}'
      ]
    },
    
    // Include both backend and frontend tests
    include: [
      'tests/**/*.test.{js,jsx}',
      'renderer/src/**/*.test.{js,jsx}'
    ],
    
    exclude: [
      'node_modules',
      'renderer/vendor',
      'dist',
      '.idea',
      '.git',
      '.cache'
    ],
    
    testTimeout: 10000,
    reporter: ['verbose'],
    
    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },
  
  // Path resolution for frontend imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'renderer/src'),
      '@components': path.resolve(__dirname, 'renderer/src/components'),
      '@hooks': path.resolve(__dirname, 'renderer/src/hooks'),
      '@utils': path.resolve(__dirname, 'renderer/src/utils')
    }
  }
});
