import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// extends Vitest's matcher and cleanup after each test case
expect.extend(matchers);

// runs a cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
vi.mock('./lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/sugih_test',
    NODE_ENV: 'test',
  },
}));

// Mock Drizzle database connection for tests
vi.mock('../db/client', () => {
  return {
    getDb: vi.fn(() => null), // Mock database connection
    sql: vi.fn(() => ({})), // Mock SQL function
    query: {}, // Mock query builder
  };
});

// Suppress console warnings during tests
const originalWarn = console.warn;
vi.stubGlobal('console', {
  ...console,
  warn: (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  },
});
