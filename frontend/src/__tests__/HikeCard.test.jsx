import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import HikeCard from '../components/HikeCard';
import api from '../api';

// Mock API
vi.mock('../api.js');

// Mock Firebase
vi.mock('../firebase.js', () => ({
  auth: {
    currentUser: {
      uid: 'firebase-uid-123',
      email: 'user@example.com',
    },
  },
}));

const mockHike = {
  id: 'hike-123',
  title: 'Mountain Peak Trail',
  description: 'Beautiful mountain hike with scenic views',
  difficulty: 'MODERATE',
  price: 45,
  capacity: 10,
  availableSpots: 5,
  distance: 8.5,
  duration: '4 hours',
  date: new Date('2026-02-15').toISOString(),
  guide: {
    id: 'guide-1',
    displayName: 'John Guide',
  },
};

const renderHikeCard = (props = {}) => {
  const defaultProps = {
    hike: mockHike,
    onSelect: vi.fn(),
    ...props,
  };

  return render(
    <BrowserRouter>
      <HikeCard {...defaultProps} />
    </BrowserRouter>
  );
};

describe('HikeCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock all API responses
    api.get.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: { success: true } });
    api.patch.mockResolvedValue({ data: { success: true } });
    api.delete.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders hike card without crashing', () => {
    const { container } = renderHikeCard();
    expect(container).toBeTruthy();
  });

  it('displays hike title and information', () => {
    renderHikeCard();
    
    const content = document.body.textContent;
    expect(content).toContain(mockHike.title);
  });

  it('displays price and availability information', () => {
    renderHikeCard();
    
    const content = document.body.textContent;
    expect(content).toContain('45');
    expect(content).toContain('Moderate');
  });

  it('renders with onSelect callback provided', () => {
    const mockOnSelect = vi.fn();
    const { container } = renderHikeCard({ onSelect: mockOnSelect });
    
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(mockOnSelect).toBeDefined();
  });

  it('handles guide information display', () => {
    renderHikeCard();
    
    const content = document.body.textContent;
    expect(content).toContain(mockHike.guide.displayName);
  });

  it('renders with different difficulty levels', () => {
    const easyHike = {
      ...mockHike,
      difficulty: 'EASY',
    };
    
    renderHikeCard({ hike: easyHike });
    
    const content = document.body.textContent;
    expect(content).toContain('Easy');
  });

  it('handles missing optional fields gracefully', () => {
    const minimalHike = {
      id: 'hike-456',
      title: 'Simple Trail',
      price: 25,
      guide: { displayName: 'Jane' },
    };
    
    const { container } = renderHikeCard({ hike: minimalHike });
    expect(container).toBeTruthy();
  });

  it('component mocks API calls and prevents errors', () => {
    api.get.mockResolvedValue({ data: { booked: false } });
    
    const { container } = renderHikeCard();
    expect(container).toBeTruthy();
    expect(api.get).toBeDefined();
  });
});
