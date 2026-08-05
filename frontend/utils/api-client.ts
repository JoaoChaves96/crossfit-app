export interface ApiClientOptions {
  token?: string | null;
  baseUrl?: string;
}

// Base URL resolution order:
//   1. explicit baseUrl option (tests / overrides)
//   2. EXPO_PUBLIC_API_BASE_URL (set in .env.local — required for device
//      testing, where `localhost` resolves to the phone, not the dev machine)
//   3. localhost fallback for web/simulator dev
const DEFAULT_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  return {
    async get<T>(url: string): Promise<T> {
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }
      return response.json();
    },

    async post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }
      return response.json();
    },

    async patch<T>(url: string, body?: Record<string, unknown>): Promise<T> {
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }
      return response.json();
    },

    async delete<T>(url: string): Promise<T> {
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }
      return response.json();
    },
  };
}

export class ApiError extends Error {
  constructor(public status: number, public message: string) {
    super(`API Error [${status}]: ${message}`);
  }
}
