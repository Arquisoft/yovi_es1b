import { defineConfig } from 'vite' // Asegúrate de que es 'vite' o 'vitest/config' según tu caso
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import * as fs from 'fs'

export default defineConfig(() => {
  // 1. Definimos las rutas a los certificados
  const keyPath = resolve(__dirname, '../certs/key.pem');
  const certPath = resolve(__dirname, '../certs/cert.pem');

  // 2. Intentamos leer los certificados solo si existen
  let httpsConfig: any = false;

  try {
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      httpsConfig = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      console.log("Certificados SSL cargados correctamente para desarrollo.");
    } else {
      console.log("Certificados no encontrados. Iniciando en modo HTTP (Normal en Docker Build).");
    }
  } catch (error) {
    console.log("ℹSaltando configuración SSL (Entorno de Build o Docker).");
  }

  return {
    plugins: [react()],
    server: {
      https: httpsConfig, // Si es false, Vite usará HTTP automáticamente
      port: 5173,
      host: 'localhost',
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html'),
          register: resolve(__dirname, 'register.html'),
          game: resolve(__dirname, 'game.html'),
        },
      },
    },
    // Mantén tu configuración de test abajo...
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/i18n-test.ts', './src/__tests__/setup.ts'],
      testTimeout: 20000,
    },
  }
})