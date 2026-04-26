import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import fs from 'node:fs';

export default defineConfig({
  // Plugins necesarios para React
  plugins: [react()],

  // Configuración del Servidor HTTPS
  server: {
    port: 5173,
    https: {
      // Usamos resolve para asegurar que encuentre la carpeta /certs en la raíz
      key: fs.readFileSync(resolve(__dirname, '../certs/key.pem')),
      cert: fs.readFileSync(resolve(__dirname, '../certs/cert.pem')),
    },
    // Opcional: para que no haya problemas de CORS en local
    cors: true,
  },

  // Configuración multi-página (MPA)
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        gamemode: resolve(__dirname, 'gamemode.html'),
        game: resolve(__dirname, 'game.html'),
      },
    },
  },

  // Configuración de Vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/i18n-test.ts', './src/__tests__/setup.ts'],
    testTimeout: 20000,
    coverage: {
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
      ],
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
