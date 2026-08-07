import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet } from 'react-native';
import { Ground } from '@/constants/design';

// Matches the OwnerSidebar rail width so the sliding panel and the sidebar it
// holds share one edge — no same-color gap on the right of the rail.
const DRAWER_WIDTH = 220;
const DURATION = 220;

interface OwnerNavDrawerProps {
  visible: boolean;
  onClose: () => void;
  /** The nav shell to render inside the sliding panel (an OwnerSidebar). */
  children: React.ReactNode;
}

/**
 * OwnerNavDrawer — the shared mobile nav drawer for the owner/coach screen suite.
 *
 * Replaces the per-screen `Modal animationType="fade"` blocks, which faded a
 * content-height panel in over a dark scrim (it read as a floating box). This
 * slides a full-height rail in from the left edge and fades the backdrop with
 * it, so the nav feels anchored to the screen rather than dropped on top of it.
 *
 * The Modal stays mounted through the exit animation via `rendered`, so the
 * panel slides back out instead of vanishing.
 */
export function OwnerNavDrawer({ visible, onClose, children }: OwnerNavDrawerProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, progress]);

  if (!rendered) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdropPressable} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]} />
      </Pressable>
      <Animated.View
        style={[styles.panel, { transform: [{ translateX }] }]}
        // The panel owns the sidebar background so it always reads full-height,
        // even before the sidebar's own content fills it.
        pointerEvents="box-none">
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Ground.base,
    // Row layout stretches the sidebar to full height on the cross axis —
    // matching how it stretches beside content on desktop, so `marginTop: auto`
    // still pins Log Out to the foot.
    flexDirection: 'row',
  },
});
