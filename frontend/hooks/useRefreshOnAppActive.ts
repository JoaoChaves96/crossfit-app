import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Runs `onActive` whenever the app returns to the foreground
 * (background/inactive → active). This complements useFocusEffect: focus only
 * fires on navigation changes, so a screen that is already mounted and focused
 * when the app is backgrounded would otherwise never refetch on resume. Server
 * state that changes while the user is away (new classes, waitlist promotions,
 * notifications) then shows up as soon as they reopen the app.
 *
 * Pass a stable callback (wrap in useCallback) — it's read through a ref, so
 * the AppState subscription is set up once and not torn down on every change.
 */
export function useRefreshOnAppActive(onActive: () => void): void {
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;

  useEffect(() => {
    const previousRef = { current: AppState.currentState };

    const handleChange = (next: AppStateStatus) => {
      const wasBackgrounded =
        previousRef.current === 'background' || previousRef.current === 'inactive';
      if (wasBackgrounded && next === 'active') {
        onActiveRef.current();
      }
      previousRef.current = next;
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, []);
}
