import React from 'react';
import { vi } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

vi.mock('lottie-react', () => {
  const MockLottie = () => React.createElement('div', { 'data-testid': 'mock-lottie' });
  return {
    __esModule: true,
    default: MockLottie,
  };
});
i18n.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  resources: {
    es: {
      translation: {}
    }
  },
  interpolation: {
    escapeValue: false
  }
});