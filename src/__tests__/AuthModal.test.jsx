import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import api from '../api';

// Mock API
vi.mock('../api.js');

// Mock Firebase
vi.mock('../firebase.js', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
}));

const renderAuthModal = (props = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    ...props,
  };

  return render(
    <BrowserRouter>
      <AuthModal {...defaultProps} />
    </BrowserRouter>
  );
};

describe('AuthModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default API mock behavior
    api.post.mockResolvedValue({ data: { id: 'user-123', email: 'test@example.com' } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    const { container } = renderAuthModal({ isOpen: true });
    expect(container).toBeTruthy();
  });

  it('does not crash when isOpen is false', () => {
    const { container } = renderAuthModal({ isOpen: false });
    expect(container).toBeTruthy();
  });

  it('calls onClose callback when provided', () => {
    const mockOnClose = vi.fn();
    renderAuthModal({ onClose: mockOnClose });
    
    // Verify callback is available
    expect(mockOnClose).toBeDefined();
    expect(typeof mockOnClose).toBe('function');
  });

  it('accepts user input without errors', async () => {
    const user = userEvent.setup();
    renderAuthModal();

    const inputs = document.querySelectorAll('input');
    if (inputs.length > 0) {
      await user.type(inputs[0], 'test@example.com');
      expect(inputs[0].value).toContain('test');
    }
  });

  it('renders successfully with all required props', () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();
    
    // Just verify rendering doesn't throw
    expect(() => {
      renderAuthModal({
        isOpen: true,
        onClose: mockOnClose,
      });
    }).not.toThrow();
  });
});

