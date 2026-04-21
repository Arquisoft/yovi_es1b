import React from 'react';
import { vi } from 'vitest';

vi.mock('lottie-react', () => {
  const MockLottie = () => React.createElement('div', { 'data-testid': 'mock-lottie' });
  return {
    __esModule: true,
    default: MockLottie,
  };
});