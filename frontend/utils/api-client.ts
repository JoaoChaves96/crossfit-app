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

/** Status used for a request that never reached the server (offline, DNS, dead host). */
const NETWORK_ERROR_STATUS = 0;

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  /**
   * Runs one request and normalizes every failure into an ApiError, so callers
   * only ever have to handle a single error shape. A rejected fetch (offline
   * device, dead server) otherwise surfaces as a raw TypeError whose message
   * ("Network request failed") screens would render verbatim.
   */
  async function request<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${url}`, init);
    } catch {
      throw new ApiError(NETWORK_ERROR_STATUS, 'fetch rejected');
    }

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json() as Promise<T>;
  }

  return {
    get<T>(url: string): Promise<T> {
      return request<T>(url, { method: 'GET', headers });
    },

    post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
      return request<T>(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    },

    patch<T>(url: string, body?: Record<string, unknown>): Promise<T> {
      return request<T>(url, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    },

    delete<T>(url: string): Promise<T> {
      return request<T>(url, { method: 'DELETE', headers });
    },
  };
}

/**
 * Copy shown to the user for each class of failure.
 *
 * Deliberately status-derived rather than taken from the response body. Backend
 * messages are written for developers and routinely leak internals — "Class
 * <uuid> not found in gym <uuid>", "Gym ID mismatch", "JWT secret not
 * configured" — so passing them through would put IDs and infrastructure
 * details in front of athletes. Screens that can say something more specific
 * (they know which action failed) branch on `status` and write their own copy;
 * see the 409 branch in app/gym-setup.tsx.
 */
const MESSAGE_BY_STATUS: Record<number, string> = {
  [NETWORK_ERROR_STATUS]:
    'Could not reach the server. Check your connection and try again.',
  400: 'Something in that request was not valid. Please check your details and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with something that already exists. Please refresh and try again.',
  422: 'Something in that request was not valid. Please check your details and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
};

const SERVER_ERROR_MESSAGE =
  'Something went wrong on our end. Please try again in a moment.';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function userMessageForStatus(status: number): string {
  const mapped = MESSAGE_BY_STATUS[status];
  if (mapped) return mapped;
  if (status >= 500) return SERVER_ERROR_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
}

/**
 * A failed API call.
 *
 * `message` is user-facing copy — every screen renders it directly in its error
 * state, so it must never contain the raw response body. The verbatim server
 * text is preserved on `detail` for logging and debugging.
 */
export class ApiError extends Error {
  /** Raw response body as returned by the server. Not for display. */
  readonly detail: string;

  constructor(public status: number, detail: string) {
    super(userMessageForStatus(status));
    this.name = 'ApiError';
    this.detail = detail;
  }
}
