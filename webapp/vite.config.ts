import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import fs from 'node:fs';

// 🔍 Definimos las rutas de los certificados
const keyPath = resolve(__dirname, '../certs/key.pem');
const certPath = resolve(__dirname, '../certs/cert.pem');

// 🛡️ Comprobamos si ambos archivos existen
const useHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-i18next', 'i18next'], // Fuerza estas dependencias
  },

  server: {
  // Configuración multi-página (MPA)

    port: 5173,
    https: useHttps ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    } : undefined, 
    cors: true,
  },


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