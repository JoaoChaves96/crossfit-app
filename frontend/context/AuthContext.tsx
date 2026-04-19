import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { storage } from '@/utils/storage';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_ID_KEY = 'auth_user_id';

export interface AuthContextType {
  token: string | null;
  userId: string | null;
  isLoading: boolean;
  setAuth: (token: string, userId: string) => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and userId from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await storage.getItem(AUTH_TOKEN_KEY);
        const storedUserId = await storage.getItem(AUTH_USER_ID_KEY);
        setToken(storedToken);
        setUserId(storedUserId);
      } catch (error) {
        console.error('Failed to load auth from storage:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setAuth = async (newToken: string, newUserId: string) => {
    await storage.setItem(AUTH_TOKEN_KEY, newToken);
    await storage.setItem(AUTH_USER_ID_KEY, newUserId);
    setToken(newToken);
    setUserId(newUserId);
  };

  const clearAuth = async () => {
    await storage.removeItem(AUTH_TOKEN_KEY);
    await storage.removeItem(AUTH_USER_ID_KEY);
    setToken(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ token, userId, isLoading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
