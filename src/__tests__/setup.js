import { vi } from 'vitest';
import '@testing-library/jest-dom';

/**
 * Mock API calls globally
 */
vi.mock('../api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

/**
 * Mock Firebase globally
 */
vi.mock('../firebase.js', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
  },
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
}));

/**
 * Mock localStorage
 */
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

/**
 * Suppress console warnings during tests
 */
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn((...args) => {
    // Still call original for actual errors but suppress act() warnings
    if (!args[0]?.includes?.('act')) {
      originalError(...args);
    }
  });
  console.warn = vi.fn((...args) => {
    // Suppress common warnings
    if (!args[0]?.includes?.('act') && !args[0]?.includes?.('Warning')) {
      originalWarn(...args);
    }
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
