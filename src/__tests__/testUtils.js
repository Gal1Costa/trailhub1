import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

/**
 * Mock API service - prevent real network calls
 */
export const createMockApiService = () => ({
  get: vi.fn().mockResolvedValue({ data: {} }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  patch: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  delete: vi.fn().mockResolvedValue({ data: {} }),
  request: vi.fn().mockResolvedValue({ data: {} }),
});

/**
 * Mock Firebase authentication
 */
export const createMockFirebase = () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
  updatePassword: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  reauthenticateWithCredential: vi.fn().mockResolvedValue(undefined),
  EmailAuthProvider: {
    credential: vi.fn().mockReturnValue({}),
  },
});

/**
 * Render component with all required providers
 */
export const renderWithProviders = (component, options = {}) => {
  const { mocks = {} } = options;
  
  // Set up API mock
  if (mocks.api) {
    vi.doMock('../api.js', () => mocks.api);
  }
  
  // Set up Firebase mock
  if (mocks.firebase) {
    vi.doMock('../firebase.js', () => mocks.firebase);
  }

  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

/**
 * Helper to wait for async operations
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Mock data generators
 */
export const mockData = {
  user: {
    id: 'user-123',
    name: 'John Hiker',
    email: 'john@example.com',
    role: 'hiker',
    firebaseUid: 'firebase-uid-123',
    status: 'ACTIVE',
    isDeleted: false,
    createdAt: '2025-01-01T00:00:00Z',
    hikerProfile: {
      id: 'hiker-profile-123',
      userId: 'user-123',
      displayName: 'John',
      bio: 'Love hiking',
      location: 'Colorado',
      interests: ['mountains', 'trails'],
    },
  },
  
  guide: {
    id: 'guide-user-123',
    name: 'Jane Guide',
    email: 'jane@example.com',
    role: 'guide',
    firebaseUid: 'firebase-guid-123',
    guide: {
      id: 'guide-profile-123',
      userId: 'guide-user-123',
      displayName: 'Jane',
      bio: 'Expert guide',
      location: 'Denver',
      yearsExperience: 5,
      isVerified: true,
    },
  },
  
  hike: {
    id: 'hike-123',
    title: 'Mountain Peak Trail',
    description: 'Beautiful mountain hike',
    difficulty: 'MODERATE',
    price: 50,
    capacity: 10,
    availableSpots: 5,
    status: 'ACTIVE',
    date: '2026-02-15T09:00:00Z',
    location: 'Rocky Mountain',
    guideId: 'guide-profile-123',
    guide: {
      id: 'guide-profile-123',
      displayName: 'Jane Guide',
    },
  },

  roleRequestStatus: {
    hasPendingRequest: false,
  },
};

/**
 * Setup for all tests
 */
export const setupTestEnvironment = () => {
  // Mock console methods to reduce noise
  global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  };
};

/**
 * Cleanup after tests
 */
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};
