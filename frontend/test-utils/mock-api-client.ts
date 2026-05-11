import type { ApiClientOptions } from '@/utils/api-client';

export type MockApiClient = {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

/**
 * Creates a mock API client whose methods are all jest.fn().
 * Pass per-method return values via the optional overrides parameter.
 *
 * Usage:
 *   const api = createMockApiClient();
 *   api.get.mockResolvedValueOnce({ id: '1' });
 */
export function createMockApiClient(_options?: ApiClientOptions): MockApiClient {
  return {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
}
