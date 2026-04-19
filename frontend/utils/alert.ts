import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert utility.
 * Uses native Alert.alert on iOS/Android, window.alert/confirm on web.
 */

interface AlertButton {
  text: string;
  onPress: () => void | Promise<void>;
  style?: 'cancel' | 'destructive' | 'default';
}

const isWeb = Platform.OS === 'web';

/**
 * Show an info alert (title + message, single OK button)
 */
export const showAlert = (title: string, message: string): void => {
  if (isWeb) {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

/**
 * Show a confirmation alert with custom buttons.
 * On web, only supports simple yes/no via window.confirm.
 */
export const showConfirm = (
  title: string,
  message: string,
  buttons: AlertButton[]
): void => {
  if (isWeb) {
    // On web, we can only reasonably support two buttons (cancel + confirm)
    // Try to find cancel and destructive/confirm buttons
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const confirmBtn = buttons.find((b) => b.style === 'destructive' || b.style === 'default');

    if (confirmBtn) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        confirmBtn.onPress();
      } else if (cancelBtn) {
        cancelBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    // Mobile: use native Alert with full button support
    Alert.alert(title, message, buttons);
  }
};

/**
 * Convenience: confirm with async handler
 */
export const confirm = async (
  title: string,
  message: string
): Promise<boolean> => {
  if (isWeb) {
    return window.confirm(`${title}\n\n${message}`);
  } else {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
        { text: 'OK', onPress: () => resolve(true) },
      ]);
    });
  }
};

/**
 * Show error alert
 */
export const showError = (title: string, message: string): void => {
  showAlert(title, message);
};
