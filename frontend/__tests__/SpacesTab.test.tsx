import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SpacesTab } from '@/app/gym-settings/SpacesTab';
import { createMockApiClient } from '@/test-utils/mock-api-client';

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockApiClient = createMockApiClient();

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => mockApiClient,
}));

// ─── Test data factories ──────────────────────────────────────────────────────

function buildSpace(overrides?: Partial<{ id: string; name: string; baseCapacity: number }>) {
  return {
    id: overrides?.id ?? 'space-1',
    name: overrides?.name ?? 'Main Floor',
    baseCapacity: overrides?.baseCapacity ?? 20,
  };
}

function buildGetSpacesResponse(spaces: ReturnType<typeof buildSpace>[]) {
  return { spaces };
}

// ─── Shared props ─────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  gymId: 'gym-abc',
  token: 'test-token',
  isMobile: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderTab(props = DEFAULT_PROPS) {
  return render(<SpacesTab {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SpacesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders the empty state message when the list is empty', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetSpacesResponse([]));

      // Act
      renderTab();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No spaces configured yet')).toBeTruthy();
      });
    });

    it('renders an Add Space button in the empty state', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetSpacesResponse([]));

      // Act
      renderTab();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Add Space')).toBeTruthy();
      });
    });
  });

  // ── Create flow ─────────────────────────────────────────────────────────────

  describe('create flow', () => {
    it('shows the add form when the Add Space button is pressed from empty state', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetSpacesResponse([]));
      renderTab();
      await waitFor(() => screen.getByText('Add Space'));

      // Act
      fireEvent.press(screen.getByText('Add Space'));

      // Assert
      expect(screen.getByText('Add Space', { exact: false })).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. Main Floor')).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. 20')).toBeTruthy();
    });

    it('shows the add form when the Add Space button is pressed from the table header', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetSpacesResponse([buildSpace()])
      );
      renderTab();
      await waitFor(() => screen.getByText('Main Floor'));

      // Act
      fireEvent.press(screen.getByText('Add Space'));

      // Assert
      expect(screen.getByPlaceholderText('e.g. Main Floor')).toBeTruthy();
    });

    it('calls POST on the correct endpoint when the create form is saved', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(buildGetSpacesResponse([]));
      mockApiClient.post.mockResolvedValueOnce({ id: 'new-space', name: 'Box A', baseCapacity: 10 });
      renderTab();
      await waitFor(() => screen.getByText('Add Space'));
      fireEvent.press(screen.getByText('Add Space'));

      // Act
      fireEvent.changeText(screen.getByPlaceholderText('e.g. Main Floor'), 'Box A');
      fireEvent.changeText(screen.getByPlaceholderText('e.g. 20'), '10');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gyms/gym-abc/configuration/spaces',
          expect.objectContaining({ name: 'Box A', baseCapacity: 10 })
        );
      });
    });
  });

  // ── Edit flow ───────────────────────────────────────────────────────────────

  describe('edit flow', () => {
    it('shows the edit form pre-filled when the Edit button is pressed', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetSpacesResponse([buildSpace({ id: 'space-1', name: 'Main Floor', baseCapacity: 20 })])
      );
      renderTab();
      await waitFor(() => screen.getByText('Main Floor'));

      // Act
      fireEvent.press(screen.getByText('Edit'));

      // Assert
      expect(screen.getByDisplayValue('Main Floor')).toBeTruthy();
      expect(screen.getByDisplayValue('20')).toBeTruthy();
    });

    it('calls PATCH on the correct endpoint when the edit form is saved', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(
        buildGetSpacesResponse([buildSpace({ id: 'space-1', name: 'Main Floor', baseCapacity: 20 })])
      );
      mockApiClient.patch.mockResolvedValueOnce({ id: 'space-1', name: 'Updated Floor', baseCapacity: 25 });
      renderTab();
      await waitFor(() => screen.getByText('Main Floor'));
      fireEvent.press(screen.getByText('Edit'));

      // Act
      fireEvent.changeText(screen.getByDisplayValue('Main Floor'), 'Updated Floor');
      fireEvent.changeText(screen.getByDisplayValue('20'), '25');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      await waitFor(() => {
        expect(mockApiClient.patch).toHaveBeenCalledWith(
          '/api/gyms/gym-abc/configuration/spaces/space-1',
          expect.objectContaining({ name: 'Updated Floor', baseCapacity: 25 })
        );
      });
    });
  });

  // ── Delete flow ─────────────────────────────────────────────────────────────

  describe('delete flow', () => {
    it('shows a confirmation dialog when the Delete button is pressed', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetSpacesResponse([buildSpace({ name: 'Main Floor' })])
      );
      renderTab();
      await waitFor(() => screen.getByText('Main Floor'));

      // Act
      fireEvent.press(screen.getByText('Delete'));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Space',
        expect.stringContaining('Main Floor'),
        expect.any(Array)
      );
    });

    it('calls DELETE on the correct endpoint when deletion is confirmed', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(
        buildGetSpacesResponse([buildSpace({ id: 'space-1', name: 'Main Floor' })])
      );
      mockApiClient.delete.mockResolvedValueOnce({});

      let confirmCallback: (() => void) | undefined;
      jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons) => {
        const deleteButton = buttons?.find((b) => b.style === 'destructive');
        confirmCallback = deleteButton?.onPress as (() => void) | undefined;
      });

      renderTab();
      await waitFor(() => screen.getByText('Main Floor'));
      fireEvent.press(screen.getByText('Delete'));

      // Act
      confirmCallback?.();

      // Assert
      await waitFor(() => {
        expect(mockApiClient.delete).toHaveBeenCalledWith(
          '/api/gyms/gym-abc/configuration/spaces/space-1'
        );
      });
    });
  });

  // ── Form validation ─────────────────────────────────────────────────────────

  describe('form validation', () => {
    it('blocks submission and shows an alert when the name is empty', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetSpacesResponse([]));
      renderTab();
      await waitFor(() => screen.getByText('Add Space'));
      fireEvent.press(screen.getByText('Add Space'));

      // Act — leave name blank, provide valid capacity
      fireEvent.changeText(screen.getByPlaceholderText('e.g. 20'), '10');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Space name is required.');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('blocks submission and shows an alert when the capacity is missing', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetSpacesResponse([]));
      renderTab();
      await waitFor(() => screen.getByText('Add Space'));
      fireEvent.press(screen.getByText('Add Space'));

      // Act — provide name, leave capacity blank
      fireEvent.changeText(screen.getByPlaceholderText('e.g. Main Floor'), 'Box A');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation',
        'Base capacity must be a positive number.'
      );
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('blocks submission and shows an alert when the capacity is zero or negative', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetSpacesResponse([]));
      renderTab();
      await waitFor(() => screen.getByText('Add Space'));
      fireEvent.press(screen.getByText('Add Space'));

      // Act
      fireEvent.changeText(screen.getByPlaceholderText('e.g. Main Floor'), 'Box A');
      fireEvent.changeText(screen.getByPlaceholderText('e.g. 20'), '0');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation',
        'Base capacity must be a positive number.'
      );
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  // ── Cancel ───────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('hides the form and returns to the list when Cancel is pressed', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetSpacesResponse([buildSpace()])
      );
      renderTab();
      await waitFor(() => screen.getByText('Main Floor'));
      fireEvent.press(screen.getByText('Edit'));
      expect(screen.getByPlaceholderText('e.g. Main Floor')).toBeTruthy();

      // Act
      fireEvent.press(screen.getByText('Cancel'));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Main Floor')).toBeTruthy();
      });
    });
  });
});
