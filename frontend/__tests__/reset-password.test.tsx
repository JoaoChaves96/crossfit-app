import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({ token: 'reset-token-abc' }),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/utils/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, createApiClient: () => ({ get: mockGet, post: mockPost }) };
});

const mockLogin = jest.fn();
const mockRouteForRole = jest.fn();
jest.mock('@/utils/routeForRole', () => ({
  routeForRole: (...args: unknown[]) => mockRouteForRole(...args),
}));

import { AuthContext } from '@/context/AuthContext';
import ResetPasswordScreen from '@/app/reset-password/[token]';

function renderScreen() {
  return render(
    <AuthContext.Provider
      value={
        {
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          login: mockLogin,
          logout: jest.fn(),
        } as never
      }>
      <ResetPasswordScreen />
    </AuthContext.Provider>,
  );
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ valid: true });
    mockPost.mockResolvedValue({ accessToken: 'header.eyJyb2xlIjoiYXRobGV0ZSJ9.sig' });
    mockLogin.mockResolvedValue(undefined);
  });

  it('validates the token from the url on mount', async () => {
    renderScreen();
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/api/auth/reset-password/reset-token-abc/validate',
      ),
    );
  });

  it('shows an invalid state without ever asking for a password', async () => {
    mockGet.mockResolvedValue({ valid: false });

    renderScreen();

    expect(await screen.findByTestId('reset-invalid-message')).toBeTruthy();
    expect(screen.queryByTestId('reset-password-input')).toBeNull();
  });

  it('routes back to forgot-password from the invalid state', async () => {
    mockGet.mockResolvedValue({ valid: false });
    renderScreen();

    fireEvent.press(await screen.findByTestId('reset-request-new-link'));
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
  });

  it('treats a failed validation call as an invalid link', async () => {
    const { ApiError } = jest.requireMock('@/utils/api-client');
    mockGet.mockRejectedValue(new ApiError(500, 'boom'));

    renderScreen();

    expect(await screen.findByTestId('reset-invalid-message')).toBeTruthy();
  });

  it('refuses to submit when the two passwords differ', async () => {
    renderScreen();
    fireEvent.changeText(await screen.findByTestId('reset-password-input'), 'aaaa1111');
    fireEvent.changeText(screen.getByTestId('reset-confirm-input'), 'bbbb2222');
    fireEvent.press(screen.getByTestId('reset-submit-btn'));

    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      /do not match/i,
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('posts the new password, signs in, and routes by role', async () => {
    renderScreen();
    fireEvent.changeText(await screen.findByTestId('reset-password-input'), 'aaaa1111');
    fireEvent.changeText(screen.getByTestId('reset-confirm-input'), 'aaaa1111');
    fireEvent.press(screen.getByTestId('reset-submit-btn'));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'reset-token-abc',
        password: 'aaaa1111',
      }),
    );
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('header.eyJyb2xlIjoiYXRobGV0ZSJ9.sig'),
    );
    await waitFor(() => expect(mockRouteForRole).toHaveBeenCalled());
  });

  it('shows the backend message when the token dies between mount and submit', async () => {
    const { ApiError } = jest.requireMock('@/utils/api-client');
    mockPost.mockRejectedValue(
      new ApiError(400, 'This reset link is no longer valid.'),
    );

    renderScreen();
    fireEvent.changeText(await screen.findByTestId('reset-password-input'), 'aaaa1111');
    fireEvent.changeText(screen.getByTestId('reset-confirm-input'), 'aaaa1111');
    fireEvent.press(screen.getByTestId('reset-submit-btn'));

    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      /no longer valid/i,
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
