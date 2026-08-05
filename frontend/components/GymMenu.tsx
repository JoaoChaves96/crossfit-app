import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

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
        <Text style={[menuStyles.gymName, nameStyle]}>{gymName}</Text>
        <Ionicons name="chevron-down" size={14} color={AppColors.textGray600} />
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
              <Text style={menuStyles.gymRowName}>{gymName}</Text>
              <Text style={menuStyles.gymRowSub}>Your gym</Text>
            </View>
            <View style={menuStyles.divider} />
            <TouchableOpacity
              style={menuStyles.logoutRow}
              onPress={handleLogout}
              testID="gym-menu-logout"
            >
              <Ionicons name="log-out-outline" size={18} color={AppColors.errorMaterial} />
              <Text style={menuStyles.logoutLabel}>Log Out</Text>
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
    gap: Spacing.sm,
  },
  gymName: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
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
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    paddingVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  gymRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  gymRowName: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  gymRowSub: {
    fontFamily: 'Inter',
    fontSize: FontSizes.xs,
    color: AppColors.textGray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderDefault,
    marginVertical: Spacing.tight,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.smMd,
  },
  logoutLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: AppColors.errorMaterial,
  },
});
