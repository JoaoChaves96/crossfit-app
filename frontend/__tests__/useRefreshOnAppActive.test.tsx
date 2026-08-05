/**
 * Tests for useRefreshOnAppActive — fires its callback when the app returns to
 * the foreground (background/inactive → active), and only then. This complements
 * useFocusEffect, which only fires on navigation changes, so an already-focused
 * screen refetches server state on resume (new classes, waitlist promotions).
 */

import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useRefreshOnAppActive } from '@/hooks/useRefreshOnAppActive';

type Handler = (state: string) => void;

// Drive AppState.addEventListener manually so we control transitions.
let handler: Handler | null = null;
let currentState = 'active';
const remove = jest.fn();

beforeEach(() => {
  handler = null;
  currentState = 'active';
  remove.mockClear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
    handler = cb as Handler;
    return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  // AppState.currentState seeds the "previous" state inside the hook.
  Object.defineProperty(AppState, 'currentState', {
    get: () => currentState,
    configurable: true,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function transition(next: string) {
  currentState = next;
  handler?.(next);
}

it('fires the callback when the app goes background → active', () => {
  const onActive = jest.fn();
  renderHook(() => useRefreshOnAppActive(onActive));

  transition('background');
  expect(onActive).not.toHaveBeenCalled();

  transition('active');
  expect(onActive).toHaveBeenCalledTimes(1);
});

it('fires on inactive → active as well (iOS multitasking)', () => {
  const onActive = jest.fn();
  renderHook(() => useRefreshOnAppActive(onActive));

  transition('inactive');
  transition('active');
  expect(onActive).toHaveBeenCalledTimes(1);
});

it('does NOT fire when already active (no real resume)', () => {
  const onActive = jest.fn();
  renderHook(() => useRefreshOnAppActive(onActive));

  // active → active (a spurious change event) must not trigger a refetch.
  transition('active');
  expect(onActive).not.toHaveBeenCalled();
});

it('uses the latest callback without re-subscribing', () => {
  const first = jest.fn();
  const second = jest.fn();
  const { rerender } = renderHook(({ cb }) => useRefreshOnAppActive(cb), {
    initialProps: { cb: first },
  });

  const subscriptionsBefore = (AppState.addEventListener as jest.Mock).mock.calls.length;

  rerender({ cb: second });
  transition('background');
  transition('active');

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
  // No new subscription on rerender — the effect did not tear down and re-add.
  expect((AppState.addEventListener as jest.Mock).mock.calls.length).toBe(subscriptionsBefore);
});

it('removes the AppState subscription on unmount', () => {
  const { unmount } = renderHook(() => useRefreshOnAppActive(jest.fn()));
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});
