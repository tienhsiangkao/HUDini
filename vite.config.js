import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 3000,
    strictPort: false,
    open: false,
  },
  
  // Build configuration for UMD bundle (Electron compatibility)
  build: {
    outDir: 'renderer',
    emptyOutDir: false, // Don't delete existing files (vendor/, index.html)
    lib: {
      entry: path.resolve(__dirname, 'renderer/src/main.jsx'),
      name: 'RendererApp',
      fileName: 'renderer_umd',
      formats: ['umd']
    },
    rollupOptions: {
      // Externalize React dependencies (loaded from vendor/)
      external: ['react', 'react-dom', 'chart.js'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'chart.js': 'Chart'
        },
        // Preserve function names for debugging
        compact: false,
        // Add source maps for development
        sourcemap: true
      }
    },
    // Optimize for development speed
    minify: false,
    // Target modern browsers (Electron uses Chromium)
    target: 'chrome120'
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'renderer/src'),
      '@components': path.resolve(__dirname, 'renderer/src/components'),
      '@hooks': path.resolve(__dirname, 'renderer/src/hooks'),
      '@utils': path.resolve(__dirname, 'renderer/src/utils')
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
