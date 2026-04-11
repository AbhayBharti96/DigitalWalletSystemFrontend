import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 3001 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    // Keep tests in a dedicated directory inside src for clear separation.
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'src/tests/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
})
