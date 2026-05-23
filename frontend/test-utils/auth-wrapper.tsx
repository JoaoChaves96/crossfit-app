import React, { type ReactNode } from 'react';
import { AuthContext, type AuthContextType, type AuthUser } from '@/context/AuthContext';

const DEFAULT_USER: AuthUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'athlete',
  gymId: 'test-gym-id',
};

const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  user: DEFAULT_USER,
  token: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve()),
};

interface AuthWrapperProps {
  children: ReactNode;
  value?: Partial<AuthContextType>;
}

/**
 * Wraps children in a mock AuthContext.
 * Override individual fields via the `value` prop.
 *
 * Usage:
 *   render(<MyComponent />, { wrapper: AuthWrapper });
 *   // or with overrides:
 *   render(<MyComponent />, { wrapper: ({ children }) => (
 *     <AuthWrapper value={{ isAuthenticated: false }}>{children}</AuthWrapper>
 *   )});
 */
export function AuthWrapper({ children, value }: AuthWrapperProps) {
  const contextValue: AuthContextType = { ...DEFAULT_AUTH_CONTEXT, ...value };
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
