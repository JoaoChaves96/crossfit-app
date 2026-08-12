---
name: Clean Ink
description: A CrossFit box-booking app that reads calm and premium — monochrome discipline plus one confident crimson accent.
colors:
  ink-strong: "#1A1A1A"
  ink-muted: "#5C5C5C"
  ink-faint: "#8A8A8A"
  ink-inverse: "#FFFFFF"
  ground-surface: "#FFFFFF"
  ground-base: "#F5F5F5"
  ground-sunken: "#F0F0F0"
  line-hairline: "#E8E8E8"
  line-divider: "#DCDCDC"
  accent: "#E23B4E"
  accent-pressed: "#C82F41"
  accent-wash: "#FDECEE"
  status-danger: "#B3261E"
  status-danger-wash: "#FBEAE8"
  status-open: "#2F7D5B"
  status-open-wash: "#EAF3EE"
typography:
  display:
    fontFamily: "HankenGrotesk_700Bold"
    fontSize: "30px"
    fontWeight: 700
    letterSpacing: "-0.4px"
  screen:
    fontFamily: "HankenGrotesk_700Bold"
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "-0.4px"
  lead:
    fontFamily: "HankenGrotesk_700Bold"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.4px"
  title:
    fontFamily: "HankenGrotesk_600SemiBold"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-0.2px"
  body:
    fontFamily: "HankenGrotesk_400Regular"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0"
  meta:
    fontFamily: "HankenGrotesk_400Regular"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0"
  label:
    fontFamily: "HankenGrotesk_600SemiBold"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.6px"
rounded:
  control: "10px"
  card: "16px"
  sheet: "20px"
  chip: "999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
  jumbo: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.control}"
    height: "46px"
    padding: "0 16px"
  button-primary-pressed:
    backgroundColor: "{colors.accent-pressed}"
    textColor: "{colors.ink-inverse}"
  button-danger:
    backgroundColor: "{colors.ground-surface}"
    textColor: "{colors.status-danger}"
    rounded: "{rounded.control}"
    height: "46px"
    padding: "0 16px"
  button-quiet:
    backgroundColor: "{colors.ground-surface}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.control}"
    height: "46px"
    padding: "0 16px"
  chip-filter-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.chip}"
    padding: "7px 14px"
  chip-filter-idle:
    backgroundColor: "{colors.ground-surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.chip}"
    padding: "7px 14px"
  status-chip-open:
    backgroundColor: "{colors.status-open-wash}"
    textColor: "{colors.status-open}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  status-chip-accent:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-pressed}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  status-chip-danger:
    backgroundColor: "{colors.status-danger-wash}"
    textColor: "{colors.status-danger}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  status-chip-neutral:
    backgroundColor: "{colors.ground-sunken}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  segment-active:
    backgroundColor: "{colors.ground-surface}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.control}"
    height: "34px"
  segment-idle:
    backgroundColor: "{colors.ground-sunken}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.control}"
    height: "34px"
  card:
    backgroundColor: "{colors.ground-surface}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.card}"
    padding: "16px"
---

# Design System: Clean Ink

## Overview

**Creative North Star: "Clean Ink"**

A booking app that feels calm and effortless, not a proof-of-concept. The whole
system rests on monochrome discipline plus one confident accent: near-black ink
on a white and near-white ground does about 95% of the work, and a single muted
crimson does the rest. Neutrals carry structure and hierarchy; the accent is
rationed so hard that when it appears — on the one primary action, the active
filter, a held spot — it means something. Generous whitespace, smooth rounded
surfaces, and one workhorse grotesk replace the flat gray-on-white, emoji-as-icon,
native-chrome look the app inherited.

This is an **Operate**-mode system. Scanability, consistency, and native task
affordances outrank expression. The athlete opens to a clean schedule, scans
classes by time and a quiet spots indicator, and books with one crimson action.
Brand does not live in decoration; it lives in precise details — the single
accent, the type ramp, the 4pt spacing rhythm, the hairline structure, and the
drawn icon set. The system is a **role layer** (`constants/design.ts`), not a
palette dump: every token has exactly one job, and it supersedes the sprawling
ad-hoc grays/blues/greens in the legacy `constants/theme.ts` for restyled surfaces.

Confirmed rejections: the earlier industrial/stencil "Box Floor" direction (too
harsh, spreadsheet-like), full-saturation Voltage red/purple (too aggressive), a
muted violet accent (set aside for crimson), and a flat black-and-white baseline
with no accent (no point of view). No dark mode in this system — the light
register is the world.

**Key Characteristics:**
- Monochrome base carried by neutrals; one rationed crimson accent.
- Destructive/urgent uses a *distinct deeper red*, never the accent.
- Selection reads through elevation + weight, not color.
- One self-hosted grotesk (Hanken Grotesk); no serif/system clash.
- Drawn Ionicons behind semantic names; zero emoji as UI.
- Smooth rounded cards, hairline structure, restrained real-offset elevation.

## Colors

A disciplined monochrome palette — ink tiers on white/near-white grounds and
hairline structure — with a single crimson accent and two status hues.

### Primary
- **Clean Ink Crimson** (`#E23B4E`): The one confident accent. Reserved for the primary CTA (`Book Class`), the active filter chip (filled pill), and selection. It is a signal, never a field.
- **Crimson Pressed** (`#C82F41`): The pressed/hover state of the primary action; also the ink color for the "booked/waitlisted" accent status chip so text tints from the same hue as its wash.
- **Crimson Wash** (`#FDECEE`): The faint accent-tinted fill behind the "booked/waitlisted" status chip — a positive personal-state background, never a large surface.

### Secondary
- **Open Green** (`#2F7D5B`): A single muted green marking availability ("Open"). Appears only as status-chip text on its wash; it stays out of the neutral flow so it never competes with the accent.
- **Open Wash** (`#EAF3EE`): The faint green fill behind the "Open" status chip.

### Neutral
- **Ink Strong** (`#1A1A1A`): Primary text, high-emphasis numbers (class time), filled-control labels, day-separator labels.
- **Ink Muted** (`#5C5C5C`): Secondary text, metadata, coach/space labels (>= 4.5:1 on white). Also serves as neutral status-chip text.
- **Ink Faint** (`#8A8A8A`): Tertiary hints, metadata icons, inactive segment labels, empty-state glyphs.
- **Ink Inverse** (`#FFFFFF`): Text/icons on the accent or on filled controls.
- **Ground Surface** (`#FFFFFF`): The primary surface — cards, sheets, header, app body.
- **Ground Base** (`#F5F5F5`): The recessed screen ground behind surfaces.
- **Ground Sunken** (`#F0F0F0`): Faint fill for the inactive segmented-toggle track, quiet/neutral chips, and empty-state icon circles.
- **Line Hairline** (`#E8E8E8`): Hairline dividers, card borders, the header's bottom rule, day-separator lines.
- **Line Divider** (`#DCDCDC`): The slightly stronger border used on idle/outlined controls (idle filter chips, quiet buttons).

### Status Roles
- **Danger** (`#B3261E`): Destructive and blocking states — cancel actions, "Full", full-spots metadata. A *deeper* red than the accent so the confident "book" action never competes with a cancel/unavailable state.
- **Danger Wash** (`#FBEAE8`): Faint danger fill behind the "Full" status chip and the danger button's pressed state.
- **Neutral status** reuses **Ink Muted** (`#5C5C5C`) on a **Ground Sunken** (`#F0F0F0`) wash for lifecycle states (Closed / In Progress / Completed) and for the membership states `expiring` / `expired` / `inactive`.
- **There is no amber/warning token, and this is settled.** Adding one for `expiring` was raised during the Membership Plans epic and **declined by the user after a live review (2026-08-12)**: `expiring` and `inactive` read as neutral chips distinguished by their label alone. A fourth hue would spend the palette's scarcity on a state the label already names. Do not re-open this.

### Named Rules
**The One Accent Rule.** Crimson (`#E23B4E`) appears in exactly three places: the primary CTA, the active filter chip, and selection. If a fourth use appears on a screen, it is wrong. The accent is a signal; its rarity is the point.

**The Two Reds Rule.** The accent and destructive red are never the same value. Confident/positive actions use crimson (`#E23B4E`); destructive/blocking states use the deeper danger red (`#B3261E`). They must not blur into each other.

**The Same-Hue Chip Rule.** Status-chip text tints from the same hue as its fill (green-on-green, crimson-on-crimson wash), never a flat gray on a colored wash.

## Typography

**Type Voice:** Hanken Grotesk (self-hosted via `@expo-google-fonts/hanken-grotesk`, weights 400/500/600/700), loaded once in the root layout behind `useFonts` — nothing renders until the face is ready, so text never flashes in a system font.

**Character:** One calm, even, modern grotesk across web and native. No serif, no system-utilitarian clash. Personality comes from the ramp and tracking, not from mixing families.

### The Weight-to-Family Mapping
React Native does **not** derive a weight from the `fontWeight` property when a
font is self-hosted — the face must be named explicitly by `fontFamily`. This is
why the `Text` primitive exists: it maps a semantic weight to the correct family
so screens never repeat family strings or rely on `fontWeight` alone.

- `regular` -> `HankenGrotesk_400Regular`
- `medium` -> `HankenGrotesk_500Medium`
- `semibold` -> `HankenGrotesk_600SemiBold`
- `bold` -> `HankenGrotesk_700Bold`

### Hierarchy (the size ramp)
- **Display** (bold, 30px, tight tracking `-0.4px`): Empty-state display headline only.
- **Screen** (bold/semibold, 24px): Screen titles.
- **Lead** (bold, 20px, tight tracking): The prominent number — the class time on a card.
- **Title** (semibold, 18px, snug tracking `-0.2px`): Card titles (class type); empty-state title.
- **Body** (regular, 15px, line-height 20px): Body copy and control labels.
- **Meta** (regular/medium, 13px): Metadata — spots, coach, space; segmented-toggle labels.
- **Label** (semibold, 12px, wide tracking `+0.6px`, uppercase): Micro-labels — status chips, day-separator labels.

### Tracking Scale
`tight` (`-0.4px`) and `snug` (`-0.2px`) pull display/lead/title text together;
`normal` (`0`) for body/meta; `wide` (`+0.6px`) is applied automatically to
uppercase micro-labels for legibility.

### Named Rules
**The Named-Face Rule.** Never style weight with `fontWeight` alone. Always route text through the `Text` primitive with a semantic `weight`; the family is what actually selects the face on native.

## Layout

Two responsive registers driven by the existing `useResponsiveLayout` split; no
new breakpoint system was introduced.

- **Mobile (default):** A single vertical column. A compact header (white surface, hairline bottom rule) holds the gym menu and notification bell. Below it, the controls block (Week/Day segmented toggle + horizontal class-type filter rail) sits as the list header, then a `FlatList` of smooth class cards. Screen ground is `Ground Base` (`#F5F5F5`); list content is padded `lg` (20px) horizontally with `md` (12px) gaps.
- **Desktop:** The same header (`DesktopTopNav`), then a centered content area (max inner width 1000px, `xxl`/`jumbo` padding) holding the controls and a **3-column grid** of the same cards. Classes fill columns round-robin.
- **Day separators:** Quiet uppercase day labels (Label role, ink-strong) with a trailing `Line Hairline` rule that fills remaining width. One separator per real day; classes are grouped into consecutive date buckets.

**Spacing rhythm:** A 4pt scale named by role, not pixel — `hair` 2, `xs` 4,
`sm` 8, `md` 12, `base` 16, `lg` 20, `xl` 24, `xxl` 32, `jumbo` 48. Card internal
padding is `base` (16px); intra-card gaps are `md` (12px); metadata rows gap `sm`
(8px).

## Elevation & Depth

Restrained. Depth is carried mostly by hairline borders and tonal grounds
(surface over base over sunken); shadows are a quiet secondary cue, never a flat
halo. Every shadow is a real offset plus a soft blur, tinted with ink (`#1A1A1A`),
not pure black.

### Shadow Vocabulary
- **Card** (`offset 0/1, blur 3, opacity 0.05`): The resting elevation of a class card — barely lifted off the ground, paired with a hairline border. Also lifts the active segmented-toggle pill off its sunken track.
- **Raised** (`offset 0/6, blur 16, opacity 0.10`): Reserved for genuinely floating surfaces (sheets/menus). Not used at rest on the schedule.

### Named Rules
**The Hairline-First Rule.** Structure and separation come from hairline borders and tonal grounds first; a card shadow only *confirms* the lift. If a border and a shadow both fight to separate the same edge, keep the hairline.

## Shapes

Smooth, softly rounded surfaces on one radius family:
- **Chip** (`999px`): Fully rounded pills — filter chips and status chips.
- **Control** (`10px`): Buttons and the segmented-toggle track (active pill uses `control - 3` = 7px).
- **Card** (`16px`): Class cards and comparable containers.
- **Sheet** (`20px`): Modals/sheets.

Borders are 1px hairlines (`Line Hairline` on cards, `Line Divider` on idle
controls). No hard corners, no heavy strokes.

## Components

### Buttons
- **Shape:** Rounded control (10px), fixed height 46px, horizontal padding `base` (16px), label in Body/semibold.
- **Primary:** Filled crimson (`#E23B4E`) with inverse-white label — the one confident action per view. Pressed: `#C82F41`.
- **Danger:** White surface, 1px `#B3261E` border, danger-red label — cancel/leave actions. Pressed fills with `#FBEAE8`. Deliberately distinct from primary so the two never compete.
- **Quiet:** White surface, 1px `Line Divider` border, ink-strong label — secondary neutral action (e.g. Join Waitlist). Pressed fills with `Ground Sunken`.
- **Disabled:** 0.45 opacity. **Loading:** inline spinner tinted to the variant's label color.

### Chips
Two distinct chip families — do not conflate them.
- **Filter chips (selection):** Horizontal pill rail. Active = filled crimson pill with inverse text (the one place selection earns the accent). Idle = white surface, 1px `Line Divider` border, muted-ink text.
- **Status chips (state):** A quiet filled wash pill, label in uppercase micro-label. Tone maps to status role: **open** = green wash, **booked/waitlisted** = crimson wash (the athlete's own held spot, a positive personal state), **full** = danger wash, **lifecycle (closed/in-progress/completed)** = neutral sunken wash. Text always tints from the fill's hue.

### Cards
- **Corner Style:** Card radius (16px).
- **Background:** `Ground Surface` white on the `Ground Base` screen ground.
- **Border:** 1px `Line Hairline`.
- **Shadow Strategy:** `Card` elevation (see Elevation & Depth) — a whisper of lift confirming the hairline.
- **Internal Padding:** `base` (16px), `md` (12px) gaps between top row / metadata / action.
- **Anatomy (class card):** top row = lead time + title class-type on the left, status chip on the right; metadata block = people/place/coach rows (drawn icon + meta text); one action button.

### Segmented Toggle
Quiet sunken track (`Ground Sunken`) with an ink-lifted active pill: the active
segment is a **white surface with Card elevation** and semibold ink-strong label;
inactive segments are faint-ink medium labels. **Selection reads through
elevation + weight, never the accent** — the crimson stays reserved for the
primary action and the active filter chip.

### Navigation / Header
A white-surface row with a hairline bottom rule holding the gym menu (name +
chevron) and the notification bell. On desktop this becomes `DesktopTopNav`.

### Iconography
Drawn **Ionicons (outline)** behind semantic names in the `Icon` primitive
(`people`, `place`, `coach`, `calendar`, `time`, `chevronDown`, `bell`, `logout`,
`check`, `close`). Default 16px, `muted` tone. The name map is the single source
of truth for which glyph means what. **No emoji as UI, ever.**

## Do's and Don'ts

### Do:
- **Do** import every value from `constants/design.ts` roles (`Ink`, `Ground`, `Line`, `Accent`, `Status`, `Type`, `Radius`, `Space`, `Elevation`). Use the role, not the hex.
- **Do** route all text through the `Text` primitive with a semantic `size`, `weight`, and `tone`; let it pick the correct Hanken Grotesk family.
- **Do** keep crimson to the primary CTA, the active filter chip, and selection (The One Accent Rule).
- **Do** use the deeper danger red (`#B3261E`) for destructive/blocking states and keep it visually distinct from the accent (The Two Reds Rule).
- **Do** convey toggle selection through elevation + weight (white lifted pill), not color.
- **Do** separate surfaces with hairlines and tonal grounds first; let the card shadow only confirm the lift (The Hairline-First Rule).
- **Do** add new icons to the `Icon` name map (Ionicons outline) rather than reaching for a glyph inline.

### Don't:
- **Don't** write raw hex in a component — always reference a design-token role.
- **Don't** let the accent spread into a fourth use or become a fill/large surface.
- **Don't** style weight with `fontWeight` alone; on native it will silently render the regular face.
- **Don't** use emoji (👥 📍 👤 📅 📅/🕐) or gray-square placeholders as UI icons.
- **Don't** put a flat, blurry drop-shadow "halo" on surfaces; elevation is a real offset with a soft ink-tinted blur.
- **Don't** reintroduce the legacy `constants/theme.ts` grays/blues/greens on a restyled screen (it survives only for not-yet-migrated surfaces).

<!--
Extending to a new screen (rollout workflow):
1. Import roles from constants/design.ts and primitives from components/cleanink.
2. Compose from the primitives (Text, Icon, Button/ButtonRow, StatusChip,
   SegmentedToggle, FilterChips); add missing icons to the Icon name map.
3. Mirror the pilot's layout register: mobile single-column list, desktop
   centered/grid via useResponsiveLayout. White surface on Ground.base; hairline
   header; quiet day/section separators.
4. Preserve product truth, copy, native affordances, and lifecycle/tenant
   behavior exactly — only the visual world changes.
No new world decisions during rollout; this system is the contract.
-->
