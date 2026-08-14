import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useUserGyms } from '@/hooks/useUserGyms';
import { Icon, Text } from '@/components/cleanink';
import { Elevation, Ground, Line, Radius, Space, Status } from '@/constants/design';

interface GymMenuProps {
  /**
   * The gym to head the menu with. Optional: the athlete screens pass the name
   * their schedule response already carries (authoritative, and present before
   * the gym list resolves), while the coach shell has no such response and lets
   * the menu name the gym from the list it loads anyway.
   */
  gymName?: string;
  /** Style overrides for the gym-name label (size differs desktop vs mobile). */
  nameStyle?: object;
}

/**
 * The gym-name header control. Tapping it opens a small menu listing the gyms
 * this session may act in, then Log Out.
 *
 * This is where switching lives on the athlete surfaces. A segmented track in
 * the header worked at desktop width and failed on a phone — it cramped the
 * gym name and the bell into a sliver and printed the active gym's name twice.
 * The menu already names the current gym and is already reachable from every
 * state that draws a header, so the other gyms belong directly beneath it. A
 * single-gym caller sees exactly the menu they saw before.
 */
export function GymMenu({ gymName, nameStyle }: GymMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();
  const { gyms, currentGymId, currentGymName, canSwitch, error, select } = useUserGyms();

  // 'My Gym' only shows in the gap before either source has answered, and it is
  // the same placeholder DesktopTopNav already falls back to.
  const displayName = gymName ?? currentGymName ?? 'My Gym';

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.replace('/login' as never);
  };

  const handleSelect = async (gymId: string) => {
    // Dismissed only once the switch took. The screen behind redrawing with the
    // new gym's data is the only confirmation there is (no success role), so
    // the menu has to get out of the way — but closing first would take the
    // failure message with it, and a refusal is the one thing worth saying.
    if (await select(gymId)) setOpen(false);
  };

  return (
    <View>
      <Pressable
        style={menuStyles.selector}
        onPress={() => setOpen(true)}
        testID="gym-menu-trigger"
      >
        <Text weight="bold" tone="strong" tracking="snug" style={[menuStyles.gymName, nameStyle]}>
          {displayName}
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
          <View style={menuStyles.menuCard} testID={canSwitch ? 'gym-switcher' : undefined}>
            <View style={menuStyles.gymRow}>
              <Text weight="semibold" size="body" tone="strong">{displayName}</Text>
              <Text size="label" tone="faint" style={menuStyles.gymRowSub}>
                {canSwitch ? 'Current gym' : 'Your gym'}
              </Text>
            </View>

            {/* The other gyms, directly under the current one — no section
                heading: the rows are the same kind of thing as the row above
                them, and a label would only restate what the list shows.
                Excluding the active gym is the whole rule; a `canSwitch` guard
                on top of it would be a second copy of the same condition,
                since one gym leaves nothing to list. */}
            {gyms
              .filter((gym) => gym.gymId !== currentGymId)
              .map((gym) => (
                <TouchableOpacity
                  key={gym.gymId}
                  style={menuStyles.gymSwitchRow}
                  onPress={() => handleSelect(gym.gymId)}
                  testID={`gym-switcher-option-${gym.gymId}`}
                >
                  <Text weight="medium" size="body" tone="default">
                    {gym.gymName}
                  </Text>
                </TouchableOpacity>
              ))}

            {error ? (
              <Text size="meta" tone={Status.danger} style={menuStyles.errorText}>
                {error}
              </Text>
            ) : null}

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
  gymSwitchRow: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
  },
  errorText: {
    paddingHorizontal: Space.base,
    paddingBottom: Space.xs,
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
