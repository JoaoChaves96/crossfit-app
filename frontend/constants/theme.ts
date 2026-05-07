/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ---------------------------------------------------------------------------
// App-wide design tokens
// ---------------------------------------------------------------------------

/**
 * AppColors — all color values used across screen files.
 *
 * Naming convention:
 *   - Semantic names where intent is clear (textPrimary, backgroundCard, …)
 *   - Descriptive hex-derived names for palette entries shared across roles
 */
export const AppColors = {
  // ---- Neutral / Text -------------------------------------------------------
  /** Primary body text — #1A1A1A */
  textPrimary: '#1A1A1A',
  /** Strong headings — #111827 */
  textHeading: '#111827',
  /** Secondary / supporting text — #374151 */
  textSecondary: '#374151',
  /** Muted / placeholder text — #6B7280 */
  textMuted: '#6B7280',
  /** Disabled / hint text — #9CA3AF */
  textDisabled: '#9CA3AF',
  /** Light disabled text — #AAAAAA */
  textLight: '#AAAAAA',
  /** Very light hint — #CCCCCC */
  textLighter: '#CCCCCC',
  /** Gray-600 used for icons and labels — #666666 */
  textGray600: '#666666',
  /** Gray-500 alias — #999999 */
  textGray500: '#999999',
  /** Gray shorthand #888888 */
  textGray400: '#888888',
  /** Gray shorthand #222222 */
  textDark: '#222222',
  /** Gray shorthand #444444 */
  textDark2: '#444444',
  /** Gray shorthand #333333 */
  textDark3: '#333333',
  /** Pure black — #000000 */
  black: '#000000',

  // ---- Backgrounds ----------------------------------------------------------
  /** White — #FFFFFF */
  backgroundWhite: '#FFFFFF',
  /** Off-white screen background — #F9FAFB */
  backgroundScreen: '#F9FAFB',
  /** Very light gray — #F5F5F5 */
  backgroundSubtle: '#F5F5F5',
  /** Light gray — #F3F4F6 */
  backgroundLight: '#F3F4F6',
  /** Slightly warm off-white — #F2F3F5 */
  backgroundWarm: '#F2F3F5',
  /** Near-white surface — #F0F0F0 */
  backgroundSurface: '#F0F0F0',
  /** Ultra-light surface — #FAFAFA */
  backgroundFaint: '#FAFAFA',
  /** Card/section surface — #F7F7F9 */
  backgroundCard: '#F7F7F9',
  /** Divider / border — #E5E7EB */
  backgroundDivider: '#E5E7EB',
  /** Border gray — #E0E0E0 */
  borderDefault: '#E0E0E0',
  /** Border gray lighter — #E4E4EA */
  borderLight: '#E4E4EA',
  /** Border gray subtler — #E8E8E8 */
  borderSubtle: '#E8E8E8',
  /** Border gray dim — #E5E5E5 */
  borderDim: '#E5E5E5',
  /** Border gray faint — #E2E3E5 */
  borderFaint: '#E2E3E5',
  /** Separator gray — #D1D5DB */
  separatorDefault: '#D1D5DB',
  /** Separator dim — #D0D0D0 */
  separatorDim: '#D0D0D0',
  /** Separator faint — #D9D9D9 */
  separatorFaint: '#D9D9D9',

  // ---- Dark / Navy surfaces (gym owner / coach dark theme) ------------------
  /** Primary dark surface — #1A1A2E */
  darkSurface: '#1A1A2E',
  /** Secondary dark surface — #1E1E2D */
  darkSurface2: '#1E1E2D',
  /** Tertiary dark surface — #2D2D42 */
  darkSurface3: '#2D2D42',
  /** Dark card — #2E2E42 (alias) */
  darkCard: '#333345',
  /** Dark card accent — #353636 */
  darkCardAccent: '#353636',
  /** Muted dark text — #8888A0 */
  darkTextMuted: '#8888A0',
  /** Slightly lighter muted dark — #555568 */
  darkTextDim: '#555568',
  /** Dark teal highlight — #1D3D47 */
  darkHighlight: '#1D3D47',
  /** Semi-transparent overlay — rgba(0,0,0,0.4) */
  overlay: 'rgba(0,0,0,0.4)',

  // ---- Brand / Primary action -----------------------------------------------
  /** Brand blue — #0a7ea4 */
  brandPrimary: '#0a7ea4',
  /** Deep blue action — #1D4ED8 */
  actionBlue: '#1D4ED8',
  /** Blue-600 — #1565C0 */
  actionBlueDark: '#1565C0',
  /** Blue dark — #004085 */
  actionBlueDarker: '#004085',
  /** Blue badge background — #DBEAFE */
  badgeBlueBg: '#DBEAFE',
  /** Blue badge light bg — #CCE5FF */
  badgeBlueBgLight: '#CCE5FF',
  /** Blue icon — #3B82F6 */
  iconBlue: '#3B82F6',
  /** Blue surface — #EFF6FF */
  surfaceBlue: '#EFF6FF',
  /** Blue surface light — #E3F2FD */
  surfaceBlueLight: '#E3F2FD',
  /** Blue surface dimmer — #BFDBFE */
  surfaceBlueDim: '#BFDBFE',
  /** Blue surface hint — #EEF0FF */
  surfaceBlueHint: '#EEF0FF',

  // ---- Success / Green ------------------------------------------------------
  /** Success green — #15803D */
  successDefault: '#15803D',
  /** Success green dark — #065F46 */
  successDark: '#065F46',
  /** Material green — #2E7D32 */
  successMaterial: '#2E7D32',
  /** Success vivid — #22C55E */
  successVivid: '#22C55E',
  /** Material green light — #4caf50 */
  successLight: '#4caf50',
  /** Success label — #155724 */
  successLabel: '#155724',
  /** Success bg — #D1FAE5 */
  successBg: '#D1FAE5',
  /** Success bg light — #D4EDDA */
  successBgLight: '#D4EDDA',
  /** Success bg vivid — #DCFCE7 */
  successBgVivid: '#DCFCE7',
  /** Success bg faint — #E8F5E9 */
  successBgFaint: '#E8F5E9',
  /** Success bg lighter — #BBF7D0 */
  successBgLighter: '#BBF7D0',
  /** Success bg green-50 — #ECFDF5 */
  successBg50: '#ECFDF5',
  /** Success bg green-50 alt — #F0FDF4 */
  successBg50Alt: '#F0FDF4',

  // ---- Warning / Amber / Orange ---------------------------------------------
  /** Amber warning — #F59E0B */
  warningDefault: '#F59E0B',
  /** Orange warning — #E65100 */
  warningOrange: '#E65100',
  /** Orange material — #FF9800 */
  warningMaterial: '#FF9800',
  /** Warning text dark — #92400E */
  warningTextDark: '#92400E',
  /** Warning text — #B45309 */
  warningText: '#B45309',
  /** Warning label — #856404 */
  warningLabel: '#856404',
  /** Warning bg — #FEF3C7 */
  warningBg: '#FEF3C7',
  /** Warning bg orange — #FFF3E0 */
  warningBgOrange: '#FFF3E0',
  /** Warning bg amber — #FFF3CD */
  warningBgAmber: '#FFF3CD',
  /** Warning bg dim — #FDE68A */
  warningBgDim: '#FDE68A',

  // ---- Error / Red ----------------------------------------------------------
  /** Error default — #DC2626 */
  errorDefault: '#DC2626',
  /** Error material — #D32F2F */
  errorMaterial: '#D32F2F',
  /** Error bootstrap — #DC3545 */
  errorBootstrap: '#DC3545',
  /** Error dark — #C62828 */
  errorDark: '#C62828',
  /** Error darker — #B91C1C */
  errorDarker: '#B91C1C',
  /** Error darkest — #991B1B */
  errorDarkest: '#991B1B',
  /** Error vivid — #EF4444 */
  errorVivid: '#EF4444',
  /** Error rose — #BE123C */
  errorRose: '#BE123C',
  /** Error label — #383D41 */
  errorLabel: '#383D41',
  /** Error bg — #FFEBEE */
  errorBg: '#FFEBEE',
  /** Error bg light — #FEF2F2 */
  errorBgLight: '#FEF2F2',
  /** Error bg lighter — #FFF5F5 */
  errorBgLighter: '#FFF5F5',
  /** Error bg faint — #FDECEA */
  errorBgFaint: '#FDECEA',
  /** Error bg FFF1F2 */
  errorBgAlt: '#FFF1F2',
  /** Error bg FEE2E2 */
  errorBgSoft: '#FEE2E2',
  /** Error bg FECACA */
  errorBgPale: '#FECACA',
  /** Error bg FECDD3 */
  errorBgPink: '#FECDD3',
  /** Error bg FCA5A5 */
  errorBgRose: '#FCA5A5',

  // ---- Misc accent ----------------------------------------------------------
  /** Purple — #7C3AED */
  accentPurple: '#7C3AED',
  /** Purple bg — #F5F3FF */
  accentPurpleBg: '#F5F3FF',
  /** Purple dim — #DDD6FE */
  accentPurpleDim: '#DDD6FE',
  /** Teal — #14B8A6 */
  accentTeal: '#14B8A6',
  /** Ocean blue background — #A1CEDC */
  accentOceanBlue: '#A1CEDC',
  /** Neutral gray #808080 */
  gray500: '#808080',
} as const;

/**
 * FontSizes — all `fontSize` values found across screen files.
 */
export const FontSizes = {
  /** 9 — tiny label */
  tiny: 9,
  /** 10 — extra-small */
  xs: 10,
  /** 11 — small */
  sm: 11,
  /** 12 — small-medium */
  smMd: 12,
  /** 13 — medium-small (most common secondary label) */
  mdSm: 13,
  /** 14 — body / default (most common) */
  body: 14,
  /** 15 — medium body */
  bodyMd: 15,
  /** 16 — medium heading */
  md: 16,
  /** 18 — large body */
  lg: 18,
  /** 20 — section heading */
  xl: 20,
  /** 22 — title */
  title: 22,
  /** 24 — large title */
  titleLg: 24,
  /** 28 — display */
  display: 28,
  /** 32 — display large */
  displayLg: 32,
  /** 36 — hero */
  hero: 36,
  /** 56 — jumbo */
  jumbo: 56,
} as const;

/**
 * FontWeights — all `fontWeight` values found across screen files.
 */
export const FontWeights = {
  /** 400 — regular */
  regular: '400' as const,
  /** 500 — medium */
  medium: '500' as const,
  /** 600 — semibold */
  semibold: '600' as const,
  /** 700 — bold */
  bold: '700' as const,
};

/**
 * LineHeights — all `lineHeight` values found across screen files.
 */
export const LineHeights = {
  /** 13 — tight */
  tight: 13,
  /** 18 — body */
  body: 18,
  /** 20 — body relaxed */
  bodyRelaxed: 20,
  /** 21 — medium */
  medium: 21,
  /** 22 — comfortable */
  comfortable: 22,
} as const;

/**
 * Spacing — all padding, margin, and gap values found across screen files.
 *
 * Values follow a 4-point base grid.
 * Named for their most common semantic use where clear.
 */
export const Spacing = {
  /** 2 — hairline */
  hairline: 2,
  /** 3 — micro */
  micro: 3,
  /** 4 — tight */
  tight: 4,
  /** 5 — tight-plus */
  tightPlus: 5,
  /** 6 — compact */
  compact: 6,
  /** 8 — small */
  sm: 8,
  /** 10 — small-medium */
  smMd: 10,
  /** 12 — medium */
  md: 12,
  /** 14 — medium-plus */
  mdPlus: 14,
  /** 15 — medium-large alt */
  mdLgAlt: 15,
  /** 16 — base (most common paddingHorizontal secondary) */
  base: 16,
  /** 18 — base-plus */
  basePlus: 18,
  /** 20 — large (most common paddingHorizontal for screens) */
  lg: 20,
  /** 24 — x-large */
  xl: 24,
  /** 28 — 2x-large */
  xxl: 28,
  /** 32 — 3x-large */
  xxxl: 32,
  /** 40 — jumbo */
  jumbo: 40,
  /** 48 — jumbo-large */
  jumboLg: 48,
  /** 60 — super */
  super: 60,
  /** 80 — ultra */
  ultra: 80,
} as const;

/**
 * BorderRadius — all `borderRadius` values found across screen files.
 */
export const BorderRadius = {
  /** 3 — hairline */
  hairline: 3,
  /** 4 — small */
  sm: 4,
  /** 6 — medium-small */
  mdSm: 6,
  /** 8 — default */
  md: 8,
  /** 10 — medium-large */
  mdLg: 10,
  /** 12 — large */
  lg: 12,
  /** 14 — large-plus */
  lgPlus: 14,
  /** 16 — x-large */
  xl: 16,
  /** 18 — x-large-plus */
  xlPlus: 18,
  /** 20 — 2x-large */
  xxl: 20,
  /** 22 — 2x-large-plus */
  xxlPlus: 22,
  /** 32 — pill-ish */
  pill: 32,
  /** 36 — pill */
  pillLg: 36,
  /** 40 — round */
  round: 40,
} as const;
