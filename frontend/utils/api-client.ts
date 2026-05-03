export interface ApiClientOptions {
  token?: string | null;
  baseUrl?: string;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl || 'http://localhost:3000';

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
