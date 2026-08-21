import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockPost = jest.fn();
jest.mock('@/utils/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    createApiClient: () => ({ post: mockPost }),
  };
});

import ForgotPasswordScreen from '@/app/forgot-password';

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue(undefined);
  });

  it('posts the address to forgot-password', async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'jane@example.com');
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'jane@example.com',
      }),
    );
  });

  it('shows the same confirmation whether or not the account exists', async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'nobody@example.com');
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));

    const confirmation = await screen.findByTestId('forgot-sent-message');
    expect(confirmation).toHaveTextContent(/If an account exists for that address/i);
    // The form is gone — there is nothing to resubmit and nothing to compare.
    expect(screen.queryByTestId('forgot-submit-btn')).toBeNull();
  });

  it('shows the confirmation even when the request fails, revealing nothing', async () => {
    const { ApiError } = jest.requireMock('@/utils/api-client');
    mockPost.mockRejectedValue(new ApiError(500, 'boom'));

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'jane@example.com');
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));

    expect(await screen.findByTestId('forgot-sent-message')).toBeTruthy();
  });

  it('offers a way back to login', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('forgot-back-to-login'));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('does not submit an empty address', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));
    expect(mockPost).not.toHaveBeenCalled();
  });
});
