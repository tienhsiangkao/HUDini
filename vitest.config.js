// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'renderer/vendor/**',
        '**/*.test.js',
        '**/*.config.js',
        'scripts/**',
        'temp_check.txt',
      ],
    },
    include: ['tests/**/*.test.js', '**/*.test.js'],
    exclude: ['node_modules', 'renderer/vendor'],
  },
});
