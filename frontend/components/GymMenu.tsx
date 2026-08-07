import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Icon, Text } from '@/components/cleanink';
import { Elevation, Ground, Line, Radius, Space, Status } from '@/constants/design';

interface GymMenuProps {
  gymName: string;
  /** Style overrides for the gym-name label (size differs desktop vs mobile). */
  nameStyle?: object;
}

/**
 * The gym-name header control. Tapping it opens a small menu.
 *
 * MVP users belong to a single gym, so this is intentionally NOT a multi-gym
 * switcher — it surfaces the gym name plus a Log Out action. The dropdown caret
 * previously did nothing; this makes it functional.
 */
export function GymMenu({ gymName, nameStyle }: GymMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.replace('/login' as never);
  };

  return (
    <View>
      <Pressable
        style={menuStyles.selector}
        onPress={() => setOpen(true)}
        testID="gym-menu-trigger"
      >
        <Text weight="bold" tone="strong" tracking="snug" style={[menuStyles.gymName, nameStyle]}>
          {gymName}
        </Text>
        <Icon name="chevronDown" size={14} tone="faint" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* Tap-outside backdrop to dismiss */}
        <Pressable style={menuStyles.backdrop} onPress={() => setOpen(false)}>
          <View style={menuStyles.menuCard}>
            <View style={menuStyles.gymRow}>
              <Text weight="semibold" size="body" tone="strong">{gymName}</Text>
              <Text size="label" tone="faint" style={menuStyles.gymRowSub}>Your gym</Text>
            </View>
            <View style={menuStyles.divider} />
            <TouchableOpacity
              style={menuStyles.logoutRow}
              onPress={handleLogout}
              testID="gym-menu-logout"
            >
              {/* Two Reds: destructive Log Out uses the deeper danger red, not the accent. */}
              <Icon name="logout" size={18} tone={Status.danger} />
              <Text weight="medium" size="body" tone={Status.danger}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const menuStyles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  gymName: {
    // Clean Ink lead size for the header gym label; face/tone from the Text primitive.
    fontSize: 18,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  menuCard: {
    position: 'absolute',
    top: 60,
    left: 20,
    minWidth: 200,
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Line.hairline,
    paddingVertical: Space.sm,
    ...Elevation.raised,
  },
  gymRow: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
  },
  gymRowSub: {
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Line.hairline,
    marginVertical: Space.xs,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
  },
});
