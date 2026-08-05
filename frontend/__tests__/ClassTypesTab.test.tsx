import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ClassTypesTab } from '@/app/gym-settings/ClassTypesTab';
import { createMockApiClient } from '@/test-utils/mock-api-client';

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockApiClient = createMockApiClient();

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => mockApiClient,
}));

// ─── Test data factories ──────────────────────────────────────────────────────

type ResultMetric = 'time' | 'reps' | 'weight' | 'rounds' | 'none';

function buildClassType(overrides?: Partial<{
  id: string;
  name: string;
  loggable: boolean;
  resultMetrics: ResultMetric;
}>) {
  return {
    id: overrides?.id ?? 'ct-1',
    name: overrides?.name ?? 'CrossFit WOD',
    loggable: overrides?.loggable ?? true,
    resultMetrics: overrides?.resultMetrics ?? ('time' as ResultMetric),
  };
}

function buildGetClassTypesResponse(classTypes: ReturnType<typeof buildClassType>[]) {
  return { classTypes };
}

// ─── Shared props ─────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  gymId: 'gym-abc',
  token: 'test-token',
  isMobile: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderTab(props = DEFAULT_PROPS) {
  return render(<ClassTypesTab {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ClassTypesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders the empty state message when the list is empty', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetClassTypesResponse([]));

      // Act
      renderTab();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No class types configured yet')).toBeTruthy();
      });
    });

    it('renders an Add Class Type button in the empty state', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetClassTypesResponse([]));

      // Act
      renderTab();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Add Class Type')).toBeTruthy();
      });
    });
  });

  // ── Create flow ─────────────────────────────────────────────────────────────

  describe('create flow', () => {
    it('shows the add form when Add Class Type is pressed from empty state', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetClassTypesResponse([]));
      renderTab();
      await waitFor(() => screen.getByText('Add Class Type'));

      // Act
      fireEvent.press(screen.getByText('Add Class Type'));

      // Assert
      expect(screen.getByText('Add Class Type', { exact: false })).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. CrossFit WOD')).toBeTruthy();
    });

    it('shows the add form when Add Class Type is pressed from the table header', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetClassTypesResponse([buildClassType()])
      );
      renderTab();
      await waitFor(() => screen.getByText('CrossFit WOD'));

      // Act
      fireEvent.press(screen.getByText('Add Class Type'));

      // Assert
      expect(screen.getByPlaceholderText('e.g. CrossFit WOD')).toBeTruthy();
    });

    it('calls POST with operation=create on the correct endpoint when the create form is saved', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(buildGetClassTypesResponse([]));
      mockApiClient.post.mockResolvedValueOnce({});
      renderTab();
      await waitFor(() => screen.getByText('Add Class Type'));
      fireEvent.press(screen.getByText('Add Class Type'));

      // Act
      fireEvent.changeText(screen.getByPlaceholderText('e.g. CrossFit WOD'), 'Yoga');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gyms/gym-abc/configuration/class-types',
          expect.objectContaining({ operation: 'create', name: 'Yoga' })
        );
      });
    });
  });

  // ── Edit flow ───────────────────────────────────────────────────────────────

  describe('edit flow', () => {
    it('shows the edit form pre-filled with the item data', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetClassTypesResponse([
          buildClassType({ id: 'ct-1', name: 'CrossFit WOD', loggable: true, resultMetrics: 'reps' }),
        ])
      );
      renderTab();
      await waitFor(() => screen.getByText('CrossFit WOD'));

      // Act
      fireEvent.press(screen.getByText('Edit'));

      // Assert
      expect(screen.getByDisplayValue('CrossFit WOD')).toBeTruthy();
      // "Reps" pill should be visible in the form
      expect(screen.getByText('Reps')).toBeTruthy();
    });

    it('calls POST with operation=update on the correct endpoint when the edit form is saved', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(
        buildGetClassTypesResponse([
          buildClassType({ id: 'ct-1', name: 'CrossFit WOD', loggable: true, resultMetrics: 'time' }),
        ])
      );
      mockApiClient.post.mockResolvedValueOnce({});
      renderTab();
      await waitFor(() => screen.getByText('CrossFit WOD'));
      fireEvent.press(screen.getByText('Edit'));

      // Act
      fireEvent.changeText(screen.getByDisplayValue('CrossFit WOD'), 'Barbell Club');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gyms/gym-abc/configuration/class-types',
          expect.objectContaining({
            operation: 'update',
            classTypeId: 'ct-1',
            name: 'Barbell Club',
          })
        );
      });
    });
  });

  // ── Delete flow ─────────────────────────────────────────────────────────────

  describe('delete flow', () => {
    it('shows a confirmation dialog when the Delete button is pressed', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetClassTypesResponse([buildClassType({ name: 'CrossFit WOD' })])
      );
      renderTab();
      await waitFor(() => screen.getByText('CrossFit WOD'));

      // Act
      fireEvent.press(screen.getByText('Delete'));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Class Type',
        expect.stringContaining('CrossFit WOD'),
        expect.any(Array)
      );
    });

    it('calls POST with operation=delete on the correct endpoint when deletion is confirmed', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue(
        buildGetClassTypesResponse([buildClassType({ id: 'ct-1', name: 'CrossFit WOD' })])
      );
      mockApiClient.post.mockResolvedValueOnce({});

      let confirmCallback: (() => void) | undefined;
      jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons) => {
        const deleteButton = buttons?.find((b) => b.style === 'destructive');
        confirmCallback = deleteButton?.onPress as (() => void) | undefined;
      });

      renderTab();
      await waitFor(() => screen.getByText('CrossFit WOD'));
      fireEvent.press(screen.getByText('Delete'));

      // Act
      confirmCallback?.();

      // Assert
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/gyms/gym-abc/configuration/class-types',
          expect.objectContaining({ operation: 'delete', classTypeId: 'ct-1' })
        );
      });
    });
  });

  // ── Form validation ─────────────────────────────────────────────────────────

  describe('form validation', () => {
    it('blocks submission and shows an alert when the name is empty', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetClassTypesResponse([]));
      renderTab();
      await waitFor(() => screen.getByText('Add Class Type'));
      fireEvent.press(screen.getByText('Add Class Type'));

      // Act — leave the name field blank and press Save
      fireEvent.press(screen.getByText('Save'));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Class type name is required.');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('blocks submission when name contains only whitespace', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(buildGetClassTypesResponse([]));
      renderTab();
      await waitFor(() => screen.getByText('Add Class Type'));
      fireEvent.press(screen.getByText('Add Class Type'));

      // Act
      fireEvent.changeText(screen.getByPlaceholderText('e.g. CrossFit WOD'), '   ');
      fireEvent.press(screen.getByText('Save'));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Class type name is required.');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  // ── Cancel ───────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('hides the form and returns to the list when Cancel is pressed', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValueOnce(
        buildGetClassTypesResponse([buildClassType()])
      );
      renderTab();
      await waitFor(() => screen.getByText('CrossFit WOD'));
      fireEvent.press(screen.getByText('Edit'));
      expect(screen.getByPlaceholderText('e.g. CrossFit WOD')).toBeTruthy();

      // Act
      fireEvent.press(screen.getByText('Cancel'));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('CrossFit WOD')).toBeTruthy();
      });
    });
  });
});
