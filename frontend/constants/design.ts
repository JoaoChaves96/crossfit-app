/**
 * Clean Ink — the committed design system for the app restyle.
 *
 * THESIS: a booking app that feels calm and effortless, not a POC. Monochrome
 * discipline + one confident accent. Neutrals do ~95% of the work; the muted
 * crimson accent appears only on the primary action, active/selected states,
 * and the occasional key number.
 *
 * This is a ROLE layer, not a palette dump. Every value has one job. It
 * supersedes the ad-hoc grays/blues/greens in `constants/theme.ts` for restyled
 * screens; theme.ts stays in place for not-yet-migrated surfaces.
 *
 * Source: DESIGN.md is written from the built pilot at finish (Impeccable
 * documenter records ground truth). Until then this file is the contract.
 */

// ─── Ink / Ground / Line ────────────────────────────────────────────────────
// The monochrome base. Near-black ink on a white/near-white ground, with a
// disciplined neutral ramp for secondary text and hairline structure.
export const Ink = {
  /** Primary text, high-emphasis numbers, filled controls — #1A1A1A */
  strong: '#1A1A1A',
  /** Secondary text, metadata, labels — #5C5C5C (>= 4.5:1 on white) */
  muted: '#5C5C5C',
  /** Tertiary text, quiet hints, inactive control text — #8A8A8A */
  faint: '#8A8A8A',
  /** Inverse ink, for text on the accent or on ink surfaces — #FFFFFF */
  inverse: '#FFFFFF',
} as const;

export const Ground = {
  /** Primary surface — cards, sheets, the app body — #FFFFFF */
  surface: '#FFFFFF',
  /** Recessed section / screen ground behind surfaces — #F5F5F5 */
  base: '#F5F5F5',
  /** Faint fill for inactive segmented track / quiet chips — #F0F0F0 */
  sunken: '#F0F0F0',
} as const;

export const Line = {
  /** Hairline dividers and card borders — #E8E8E8 */
  hairline: '#E8E8E8',
  /** Slightly stronger separator where a divider must read — #DCDCDC */
  divider: '#DCDCDC',
} as const;

// ─── Accent (Clean Ink crimson) ─────────────────────────────────────────────
// Restrained strategy: the accent is reserved for the primary action, active
// toggles/chips, and selection. It never becomes a field.
export const Accent = {
  /** Primary crimson — the one confident action — #E23B4E */
  base: '#E23B4E',
  /** Pressed / hover state — #C82F41 */
  pressed: '#C82F41',
  /** Faint accent wash for active-chip / selected backgrounds — #FDECEE */
  wash: '#FDECEE',
  /** Text/ink on top of the accent — #FFFFFF */
  on: '#FFFFFF',
} as const;

// ─── Status roles ────────────────────────────────────────────────────────────
// Destructive/urgent uses a DEEPER red, distinct from the accent, so the
// confident "book" action never competes with a cancel/danger state.
// Success/info stay neutral-leaning; a single muted green carries "open".
export const Status = {
  /** Destructive & urgent (cancel, full/waitlist) — deeper than accent — #B3261E */
  danger: '#B3261E',
  /** Faint danger wash — #FBEAE8 */
  dangerWash: '#FBEAE8',
  /** Open / available — a single muted green — #2F7D5B */
  open: '#2F7D5B',
  /** Faint open wash — #EAF3EE */
  openWash: '#EAF3EE',
  /** Neutral/closed/completed text — reuses ink.muted */
  neutral: '#5C5C5C',
  /** Neutral chip wash — #F0F0F0 */
  neutralWash: '#F0F0F0',
} as const;

// ─── Type ─────────────────────────────────────────────────────────────────────
// One workhorse grotesk (Hanken Grotesk), self-hosted from assets/fonts.
// Family names match the keys registered in the root layout's useFonts().
export const Type = {
  family: {
    regular: 'HankenGrotesk_400Regular',
    medium: 'HankenGrotesk_500Medium',
    semibold: 'HankenGrotesk_600SemiBold',
    bold: 'HankenGrotesk_700Bold',
  },
  /** Size ramp with clear steps. */
  size: {
    /** micro labels, badge text — 12 */
    label: 12,
    /** small metadata — 13 */
    meta: 13,
    /** body / controls — 15 */
    body: 15,
    /** card title (class type) — 18 */
    title: 18,
    /** prominent number (class time) — 20 */
    lead: 20,
    /** screen title — 24 */
    screen: 24,
    /** empty-state display — 30 */
    display: 30,
  },
  /** Display/lead tracking pulled tight; body stays neutral. */
  tracking: {
    tight: -0.4,
    snug: -0.2,
    normal: 0,
    /** uppercase micro-labels get positive tracking for legibility */
    wide: 0.6,
  },
  lineHeight: {
    tight: 22,
    body: 20,
    relaxed: 24,
  },
} as const;

// ─── Radius / Spacing / Elevation ──────────────────────────────────────────────
// Smooth rounded surfaces, one spacing rhythm.
export const Radius = {
  chip: 999,
  control: 10,
  card: 16,
  sheet: 20,
} as const;

/** 4pt rhythm; named by role, not by pixel. */
export const Space = {
  hair: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  jumbo: 48,
} as const;

/** Restrained elevation — a real offset + soft blur, never a flat halo. */
export const Elevation = {
  card: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  raised: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/** Convenience bundle for imports that want one symbol. */
export const CleanInk = { Ink, Ground, Line, Accent, Status, Type, Radius, Space, Elevation } as const;
