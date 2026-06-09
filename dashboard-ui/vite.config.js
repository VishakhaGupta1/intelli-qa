import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('/victory') || id.includes('/lodash')) {
            return 'vendor-charts';
          }
          return 'vendor-utils';
        }
      }
    }
  }
});
