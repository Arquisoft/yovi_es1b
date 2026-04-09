import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // Plugings necesarios para react
  plugins: [react()],

  // Configuración  multi-pagina (MPA)
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

  // Configuracion de Vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 20000,
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
})
