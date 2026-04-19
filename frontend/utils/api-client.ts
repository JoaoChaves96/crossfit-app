/**
 * API Client utility.
 * Attaches x-user-id and x-gym-id headers for header-based authentication.
 */

export interface ApiClientOptions {
  token?: string; // Legacy support (not used with header-based auth)
  userId?: string | null;
  gymId?: string | null;
  baseUrl?: string;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl || 'http://localhost:3000';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add header-based auth headers
  if (options.userId) {
    headers['x-user-id'] = options.userId;
  }
  if (options.gymId) {
    headers['x-gym-id'] = options.gymId;
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
