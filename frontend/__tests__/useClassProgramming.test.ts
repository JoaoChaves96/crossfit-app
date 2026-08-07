import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useClassProgramming } from '@/app/class-management/useClassProgramming';
import { createMockApiClient } from '@/test-utils/mock-api-client';

const mockApiClient = createMockApiClient();

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(() => mockApiClient),
}));

type Params = Parameters<typeof useClassProgramming>[0];

function buildParams(overrides?: Partial<Params>): Params {
  return {
    token: 'test-token',
    currentGymId: 'gym-abc',
    classId: 'class-123',
    ...overrides,
  };
}

function buildProgrammingResponse(overrides?: Partial<{
  content: string | null;
  loggable: boolean;
  lastUpdatedAt: string | null;
}>) {
  return {
    content: '5 rounds: 10 pull-ups, 20 push-ups',
    loggable: true,
    lastUpdatedAt: '2026-06-14T18:00:00.000Z',
    ...overrides,
  };
}

function buildSaveResponse(overrides?: Partial<{ content: string; lastModifiedAt: string }>) {
  return {
    id: 'prog-1',
    classId: 'class-123',
    content: 'New programming',
    createdByUserId: 'user-1',
    createdAt: '2026-06-14T18:00:00.000Z',
    lastModifiedAt: '2026-06-15T09:00:00.000Z',
    lastModifiedByUserId: 'user-1',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiClient.get.mockResolvedValue(buildProgrammingResponse());
  mockApiClient.post.mockResolvedValue(buildSaveResponse());
});

describe('useClassProgramming', () => {
  describe('load', () => {
    it('fetches programming from the class programming endpoint', async () => {
      // Arrange / Act
      renderHook(() => useClassProgramming(buildParams()));

      // Assert
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/gyms/gym-abc/classes/class-123/programming'
        );
      });
    });

    it('seeds the draft content verbatim from the fetched content', async () => {
      // Arrange
      const raw = 'AMRAP 12\n\nNotes:\nscale the pull-ups';
      mockApiClient.get.mockResolvedValueOnce(buildProgrammingResponse({ content: raw }));

      // Act
      const { result } = renderHook(() => useClassProgramming(buildParams()));

      // Assert — no marker splitting; content round-trips unchanged
      await waitFor(() => {
        expect(result.current.content).toBe(raw);
      });
    });

    it('leaves the draft empty when the class has no programming', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildProgrammingResponse({ content: null, loggable: false, lastUpdatedAt: null })
      );

      // Act
      const { result } = renderHook(() => useClassProgramming(buildParams()));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.content).toBe('');
      expect(result.current.savedContent).toBeNull();
    });

    it('exposes a load error when the fetch rejects', async () => {
      // Arrange
      mockApiClient.get.mockRejectedValueOnce(new Error('Network failure'));

      // Act
      const { result } = renderHook(() => useClassProgramming(buildParams()));

      // Assert
      await waitFor(() => {
        expect(result.current.loadError).toBe('Network failure');
      });
    });

    it('does not call the API when there is no token', async () => {
      // Arrange / Act
      renderHook(() => useClassProgramming(buildParams({ token: null })));

      // Assert
      await waitFor(() => {
        expect(mockApiClient.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('isDirty', () => {
    it('is false right after a successful load', async () => {
      // Arrange / Act
      const { result } = renderHook(() => useClassProgramming(buildParams()));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.isDirty).toBe(false);
    });

    it('becomes true after the content is edited', async () => {
      // Arrange
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Act
      act(() => {
        result.current.setContent('changed');
      });

      // Assert
      expect(result.current.isDirty).toBe(true);
    });

    it('becomes true after the loggable flag is toggled', async () => {
      // Arrange
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Act
      act(() => {
        result.current.setLoggable(false);
      });

      // Assert
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('save', () => {
    it('posts the trimmed content and loggable flag as a single content field', async () => {
      // Arrange
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => {
        result.current.setContent('  New programming  ');
      });

      // Act
      await act(async () => {
        await result.current.save();
      });

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/classes/class-123/programming',
        { classId: 'class-123', content: 'New programming', loggable: true }
      );
    });

    it('marks the save as done once the API resolves', async () => {
      // Arrange
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => {
        result.current.setContent('New programming');
      });

      // Act
      await act(async () => {
        await result.current.save();
      });

      // Assert
      expect(result.current.didSave).toBe(true);
    });

    it('clears the dirty flag after a successful save', async () => {
      // Arrange
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => {
        result.current.setContent('New programming');
      });

      // Act
      await act(async () => {
        await result.current.save();
      });

      // Assert
      expect(result.current.isDirty).toBe(false);
    });

    it('exposes a save error when the API rejects', async () => {
      // Arrange
      mockApiClient.post.mockRejectedValueOnce(new Error('Class is locked'));
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => {
        result.current.setContent('New programming');
      });

      // Act
      await act(async () => {
        await result.current.save();
      });

      // Assert
      expect(result.current.saveError).toBe('Class is locked');
    });

    it('rejects an empty draft without calling the API', async () => {
      // Arrange
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => {
        result.current.setContent('   ');
      });

      // Act
      await act(async () => {
        await result.current.save();
      });

      // Assert
      expect(mockApiClient.post).not.toHaveBeenCalled();
      expect(result.current.saveError).toBe('Programming cannot be empty.');
    });

    it('clears isSaving after the API settles', async () => {
      // Arrange
      const { result } = renderHook(() => useClassProgramming(buildParams()));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => {
        result.current.setContent('New programming');
      });

      // Act
      await act(async () => {
        await result.current.save();
      });

      // Assert
      expect(result.current.isSaving).toBe(false);
    });
  });
});
