/**
 * API Client utility.
 * Automatically attaches Authorization header with JWT token.
 * Token is passed as parameter (via hooks in components).
 */

export interface ApiClientOptions {
  token: string;
  baseUrl?: string;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl || (typeof window !== 'undefined' ? 'http://localhost:3000' : 'http://localhost:3000');
  const token = options.token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

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

    async post<T>(url: string, body?: Record<string, any>): Promise<T> {
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

    async patch<T>(url: string, body?: Record<string, any>): Promise<T> {
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
