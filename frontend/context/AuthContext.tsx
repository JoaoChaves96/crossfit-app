import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { storage } from '@/utils/storage';

const AUTH_TOKEN_KEY = 'auth_token';

export interface AuthUser {
  id: string;
  email: string;
  role: string | null;
  gymId: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(token: string): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1];
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  if (typeof payload.exp !== 'number') return false;
  return Date.now() / 1000 > payload.exp;
}

function userFromPayload(payload: Record<string, unknown>): AuthUser {
  return {
    id: typeof payload.sub === 'string' ? payload.sub : '',
    email: typeof payload.email === 'string' ? payload.email : '',
    role: typeof payload.role === 'string' ? payload.role : null,
    gymId: typeof payload.gymId === 'string' ? payload.gymId : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await storage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
          const payload = decodeJwtPayload(storedToken);
          if (isTokenExpired(payload)) {
            await storage.removeItem(AUTH_TOKEN_KEY);
          } else {
            setToken(storedToken);
            setUser(userFromPayload(payload));
          }
        }
      } catch (error) {
        console.error('Failed to load auth from storage:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (newToken: string): Promise<void> => {
    await storage.setItem(AUTH_TOKEN_KEY, newToken);
    const payload = decodeJwtPayload(newToken);
    setToken(newToken);
    setUser(userFromPayload(payload));
  };

  const logout = async (): Promise<void> => {
    await storage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: user !== null && token !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
