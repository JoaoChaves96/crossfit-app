import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';
import { Space } from '@/constants/design';

/**
 * How much of the focused input must stay below the top of the screen when
 * scrolling to reveal controls beneath it. Roughly two lines of body text, so
 * the caret stays in view even on a tall auto-grown input.
 */
const MIN_INPUT_BOTTOM_ON_SCREEN = 56;

/**
 * Keeps the focused text field clear of the on-screen keyboard.
 *
 * `KeyboardAvoidingView behavior="padding"` — the pattern this replaces — only
 * SHRINKS its container. It never brings an off-screen field up, so any field
 * low on a scrollable mobile page stays buried under the keyboard. This is
 * invisible in a desktop browser (the browser handles it natively), so it only
 * reproduces on a physical device.
 *
 * Proven first on `coach-class-details` (commit 4d7a215); extracted here so the
 * six screens that carried the same defect share one implementation.
 *
 * Usage:
 *   const kb = useKeyboardAwareScroll();
 *   <ScrollView ref={kb.scrollRef} {...kb.scrollViewProps}
 *     contentContainerStyle={[styles.scroll, kb.contentInsetStyle]}>
 *     <TextInput onFocus={kb.onInputFocus} onBlur={kb.onInputBlur} … />
 *
 * For an auto-growing multiline input, also call `scrollFocusedIntoView(false)`
 * from `onContentSizeChange` — a one-shot on focus is not enough, because the
 * caret line sinks back under the keyboard as the input grows.
 *
 * When a Save button (or similar) sits below the input and must stay reachable,
 * wrap both in a `<View ref={kb.keepVisibleRef} collapsable={false}>`; the
 * scroll then targets that wrapper's bottom edge rather than the input's.
 */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  /**
   * Optional wrapper around the input plus any controls below it that must
   * stay visible with the keyboard up. Attach with `collapsable={false}` so
   * Android cannot optimise the view away and make it unmeasurable.
   */
  const keepVisibleRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const isInputFocusedRef = useRef(false);
  /** Top edge of the keyboard in window coords; null while it is dismissed. */
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  /**
   * Scroll just enough to bring the focused field's BOTTOM edge (where the
   * caret sits while typing) above the keyboard. Targeting the top edge leaves
   * a tall input's lower lines buried.
   *
   * If `keepVisibleRef` is attached to a wrapper containing the input AND the
   * controls below it (a Save button, say), that wrapper's bottom edge is the
   * target instead. Clearing only the input leaves the button under the
   * keyboard — or under the iOS predictive-text strip sitting on top of it
   * (`endCoordinates` already includes that strip's height).
   *
   * Measured with `measureInWindow` against the keyboard's own frame.
   * `measureLayout` is not an option here: it needs a `ReactNativeElement` as
   * its relative node, and under the New Architecture Fabric rejects a numeric
   * node handle with "must be called with a ref to a native component" — then
   * silently does nothing, so the field just stays hidden.
   */
  const scrollFocusedIntoView = useCallback((animated: boolean) => {
    if (Platform.OS === 'web') return;
    const keyboardTop = keyboardTopRef.current;
    if (keyboardTop == null) return;
    // TextInput.State tracks the focused input itself, so no per-field ref is
    // needed — it is set in TextInput's own onFocus, before the keyboard shows.
    const focused = TextInput.State.currentlyFocusedInput();
    if (focused == null) return;

    focused.measureInWindow((_x, inputY, _w, inputH) => {
      const applyScroll = (targetBottom: number) => {
        let overflow = targetBottom + Space.base - keyboardTop;
        if (overflow <= 0) return;
        // Don't chase the trailing controls so far that the caret leaves the
        // top of the screen — the input's own bottom edge must stay visible,
        // because that is where the caret sits while typing.
        const headroom = inputY + inputH - MIN_INPUT_BOTTOM_ON_SCREEN;
        if (headroom <= 0) return;
        overflow = Math.min(overflow, headroom);
        scrollRef.current?.scrollTo({ y: scrollOffsetRef.current + overflow, animated });
      };

      const wrapper = keepVisibleRef.current;
      if (wrapper == null) {
        applyScroll(inputY + inputH);
        return;
      }
      wrapper.measureInWindow((_wx, wrapY, _ww, wrapH) => {
        // max() guards a stale/zero wrapper measurement collapsing the target.
        applyScroll(Math.max(inputY + inputH, wrapY + wrapH));
      });
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onShow = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTopRef.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
      if (isInputFocusedRef.current) scrollFocusedIntoView(true);
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopRef.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [scrollFocusedIntoView]);

  const onInputFocus = useCallback(() => {
    isInputFocusedRef.current = true;
    // Moving between fields while the keyboard is already up does not fire
    // keyboardDidShow, so the newly focused field has to be scrolled here.
    scrollFocusedIntoView(true);
  }, [scrollFocusedIntoView]);

  const onInputBlur = useCallback(() => {
    isInputFocusedRef.current = false;
  }, []);

  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  return {
    scrollRef,
    keepVisibleRef,
    /** Spread onto the ScrollView. */
    scrollViewProps: {
      // iOS-only prop: it reserves the keyboard inset so content has somewhere
      // to scroll into. Android gets that room as real padding below instead.
      automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
      onScroll,
      scrollEventThrottle: 16,
      keyboardShouldPersistTaps: 'handled' as const,
    },
    /** Append to the ScrollView's contentContainerStyle (Android room). */
    contentInsetStyle: Platform.OS === 'android' ? { paddingBottom: keyboardHeight } : null,
    onInputFocus,
    onInputBlur,
    scrollFocusedIntoView,
    keyboardHeight,
  };
}
