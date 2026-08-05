# Tier-2 Mobile Reflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reflow five owner/coach screens so their mobile (≤768px) layout matches their `.pen` design frames instead of showing desktop tables/grids/stat-tiles.

**Architecture:** Each screen already forks desktop vs. mobile. This plan only touches the mobile branch of each screen, following the reference pattern in `frontend/app/coaches.tsx` — `isMobile ? <Card list> : <table>` with dedicated mobile sub-components that reuse the existing handlers. No backend, API, or desktop-layout changes.

**Tech Stack:** Expo Router / React Native Web, TypeScript strict mode. Styles live in per-screen `.styles.ts` files. Types come from `@/types/api.gen` (generated from Swagger).

## Global Constraints

- **Mobile gate:** use the shared `useResponsiveLayout()` `isMobile` (`width <= 768`) where a screen already imports it. The two Coach screens (`coach-class-details.tsx`, `coach-mark-attendance.tsx`) keep their existing inline `const MOBILE_BREAKPOINT = 768` + `useWindowDimensions()` — do NOT refactor them to the hook in this batch.
- **Desktop untouched:** never modify the desktop branch/`styles.*` desktop rules. Only the mobile branch and mobile style objects change.
- **No backend/API/type changes:** all data is already fetched. Do not run `generate:api-types`; do not touch `backend/`.
- **DEFERRED — Membership Plans:** render no plan data or plan columns anywhere. (Relevant to Task 5's Info tab — omit any plan field.)
- **Out of scope (separate cards, do NOT fix here):** athlete UUID→name (`6a70cdb7`), "300 seconds" raw duration (`6a70cd97`), Coach Class Details `Class Type/Date/Space` rendering "—" from missing route params. Reflow only.
- **Reuse existing handlers/state:** no new data-fetching, no new network calls. Presentation only.
- **testIDs:** preserve every existing `testID`. New interactive elements get a `testID`.
- **Verification per task:** (1) `cd frontend && npx tsc --noEmit` passes; (2) live check at 390×844 against the named frame; (3) desktop width (≥1024) visually unchanged. Commit only on the user's explicit go-ahead — leave each task committed locally per the step, but do not push.

---

## File Structure

Files touched, by task:

- **Task 1** — `frontend/app/gym-settings/SpacesTab.tsx` (add `SpaceCard` + mobile branch), `frontend/app/gym-settings/gym-settings.styles.ts` (add card styles). Pass `isMobile` down from `frontend/app/gym-settings/index.tsx`.
- **Task 2** — `frontend/app/gym-settings/ClassTypesTab.tsx` (add `ClassTypeCard` + mobile branch), reuse Task-1 card styles.
- **Task 3** — `frontend/app/schedule-dashboard.tsx` (mobile day-strip + vertical card list), `frontend/app/schedule-dashboard.styles.ts` (day-strip + full-width mobile card styles).
- **Task 4** — `frontend/app/coach-class-details.tsx` (mobile info panel → compact 2-col grid), `frontend/app/coach-class-details.styles.ts` (2-col grid styles).
- **Task 5** — `frontend/app/coach-mark-attendance.tsx` (drop stat tiles + STATUS row; subheader + Select All + footer count), `frontend/app/coach-mark-attendance.styles.ts`.
- **Task 6** — `frontend/app/class-management/index.tsx` (3-tab bar + Info tab), `frontend/app/class-management/ClassHeader.tsx` (split into mobile Info-tab body vs desktop header), `frontend/app/class-management/class-management.styles.ts`.

The two Coach screens keep their `{ styles, mobileStyles }` export shape from their `.styles.ts`; new mobile rules go in the `mobileStyles` object.

---

## Task 1: Gym Settings — Spaces tab table → card list (mobile)

**Design frame:** `gym-owner-screens.pen` node `nU1Kb`. Populated state = a vertical list of cards, one per space: name as title, "Base capacity: N" as subtext, Edit/Delete as row actions. (The frame shows the empty state, which already reflows — leave `EmptySpaces` as-is.)

**Files:**
- Modify: `frontend/app/gym-settings/SpacesTab.tsx`
- Modify: `frontend/app/gym-settings/gym-settings.styles.ts`
- Modify: `frontend/app/gym-settings/index.tsx` (thread `isMobile` prop)
- Modify: `frontend/app/gym-settings/ClassTypesTab.tsx` (accept `isMobile` prop — signature only; behavior added in Task 2)

**Interfaces:**
- Consumes: `useResponsiveLayout().isMobile` (already imported in `index.tsx`), `SpaceItem = components['schemas']['SpaceItemDto']` (has `id`, `name`, `baseCapacity`).
- Produces: `SpacesTab` and `ClassTypesTab` now take an added `isMobile: boolean` prop. New style keys `spaceCardList`, `entityCard`, `entityCardTop`, `entityCardTitle`, `entityCardSub`, `entityCardActions` on the gym-settings stylesheet (reused by Task 2).

- [ ] **Step 1: Add mobile card styles to `gym-settings.styles.ts`**

Add these keys to the existing `StyleSheet.create({...})` object (place near the table styles). Match the file's existing color constants/spacing; the values below follow the `coaches.styles` card idiom:

```ts
  spaceCardList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  entityCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  entityCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  entityCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  entityCardSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  entityCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
```

- [ ] **Step 2: Add the `SpaceCard` sub-component and mobile list to `SpacesTab.tsx`**

Change the `SpacesTabProps` interface and the `SpacesTable` render path. First, extend props:

```tsx
interface SpacesTabProps {
  gymId: string;
  token: string;
  isMobile: boolean;
}

export function SpacesTab({ gymId, token, isMobile }: SpacesTabProps) {
```

Add a `SpaceCard` component above `SpacesTab` (after `SpacesTable`):

```tsx
// ─── Space Card (Mobile) ───────────────────────────────────────────────────────

interface SpaceCardProps {
  space: SpaceItem;
  onEdit: (space: SpaceItem) => void;
  onDelete: (space: SpaceItem) => void;
}

function SpaceCard({ space, onEdit, onDelete }: SpaceCardProps) {
  return (
    <View style={styles.entityCard}>
      <View style={styles.entityCardTop}>
        <Text style={styles.entityCardTitle} numberOfLines={1}>{space.name}</Text>
        <View style={styles.entityCardActions}>
          <TouchableOpacity
            testID={`space-edit-btn-${space.id}`}
            style={styles.editBtn}
            onPress={() => onEdit(space)}
            activeOpacity={0.7}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`space-delete-btn-${space.id}`}
            style={styles.deleteBtn}
            onPress={() => onDelete(space)}
            activeOpacity={0.7}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entityCardSub}>Base capacity: {space.baseCapacity}</Text>
    </View>
  );
}

// ─── Spaces Card List (Mobile) ─────────────────────────────────────────────────

interface SpacesCardListProps {
  spaces: SpaceItem[];
  onEdit: (space: SpaceItem) => void;
  onDelete: (space: SpaceItem) => void;
  onAddPress: () => void;
}

function SpacesCardList({ spaces, onEdit, onDelete, onAddPress }: SpacesCardListProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Spaces</Text>
        <TouchableOpacity testID="add-space-btn" style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>Add Space</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.spaceCardList}>
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Fork the populated render on `isMobile`**

Replace the final `return <SpacesTable ... />` block (the one after the `spaces.length === 0` guard) with:

```tsx
  if (isMobile) {
    return (
      <SpacesCardList
        spaces={spaces}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
        onAddPress={handleAddPress}
      />
    );
  }

  return (
    <SpacesTable
      spaces={spaces}
      onEdit={handleEditPress}
      onDelete={handleDeletePress}
      onAddPress={handleAddPress}
    />
  );
```

- [ ] **Step 4: Thread `isMobile` from `index.tsx` into both tabs**

In `frontend/app/gym-settings/index.tsx`, the `isMobile` value already exists from `useResponsiveLayout()`. Pass it to both tab components (Task 2 uses the `ClassTypesTab` prop):

```tsx
          {activeTab === 'spaces' && token && currentGymId ? (
            <SpacesTab gymId={currentGymId} token={token} isMobile={isMobile} />
          ) : activeTab === 'spaces' ? (
```
and
```tsx
          ) : activeTab === 'class-types' && token && currentGymId ? (
            <ClassTypesTab gymId={currentGymId} token={token} isMobile={isMobile} />
          ) : activeTab === 'class-types' ? (
```

- [ ] **Step 5: Add the `isMobile` prop to `ClassTypesTab` signature (no behavior yet)**

So `index.tsx` type-checks now. In `ClassTypesTab.tsx`:

```tsx
interface ClassTypesTabProps {
  gymId: string;
  token: string;
  isMobile: boolean;
}

export function ClassTypesTab({ gymId, token, isMobile }: ClassTypesTabProps) {
```

(Task 2 consumes `isMobile`. Until then it's referenced only in the signature; if `tsc`'s `noUnusedParameters` is on, prefix with `_` is NOT needed because Task 2 immediately follows — but if you commit Task 1 alone and lint complains, add a `void isMobile;` line at the top of the body and remove it in Task 2.)

- [ ] **Step 6: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Live check**

Serve the app, log in as `owner@example.com` / `password123`, navigate to Gym Settings (`/gym-settings`), Spaces tab. Resize to 390×844.
Expected: spaces render as a vertical card list (name + "Base capacity: N" + Edit/Delete), NOT the `Name / Base Capacity / Actions` table. At ≥1024px the desktop table is unchanged.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/gym-settings/SpacesTab.tsx frontend/app/gym-settings/ClassTypesTab.tsx frontend/app/gym-settings/index.tsx frontend/app/gym-settings/gym-settings.styles.ts
git commit -m "fix(gym-settings): reflow Spaces tab to card list on mobile"
```

---

## Task 2: Gym Settings — Class Types tab table → card list (mobile)

**Design frame:** `gym-owner-screens.pen` node `nU1Kb` (same Settings shell). Populated state = vertical cards, one per class type: name as title, a "Loggable: Yes/No" + "Metric: X" subline, Edit/Delete actions.

**Files:**
- Modify: `frontend/app/gym-settings/ClassTypesTab.tsx`
- Reuse: card styles added in Task 1 (`entityCard`, `entityCardTop`, `entityCardTitle`, `entityCardSub`, `entityCardActions`, `spaceCardList`).

**Interfaces:**
- Consumes: `isMobile` prop (added in Task 1 Step 5), `ClassTypeItem = components['schemas']['ClassTypeItemDto']` (`id`, `name`, `loggable`, `resultMetrics`), `RESULT_METRIC_LABELS` (already defined in this file).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Add `ClassTypeCard` + mobile list to `ClassTypesTab.tsx`**

Add after `ClassTypesTable`:

```tsx
// ─── Class Type Card (Mobile) ───────────────────────────────────────────────────

interface ClassTypeCardProps {
  classType: ClassTypeItem;
  onEdit: (classType: ClassTypeItem) => void;
  onDelete: (classType: ClassTypeItem) => void;
}

function ClassTypeCard({ classType, onEdit, onDelete }: ClassTypeCardProps) {
  return (
    <View style={styles.entityCard}>
      <View style={styles.entityCardTop}>
        <Text style={styles.entityCardTitle} numberOfLines={1}>{classType.name}</Text>
        <View style={styles.entityCardActions}>
          <TouchableOpacity
            testID={`class-type-edit-btn-${classType.id}`}
            style={styles.editBtn}
            onPress={() => onEdit(classType)}
            activeOpacity={0.7}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`class-type-delete-btn-${classType.id}`}
            style={styles.deleteBtn}
            onPress={() => onDelete(classType)}
            activeOpacity={0.7}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entityCardSub}>
        {classType.loggable ? 'Loggable' : 'Not loggable'} · Metric: {RESULT_METRIC_LABELS[classType.resultMetrics]}
      </Text>
    </View>
  );
}

// ─── Class Types Card List (Mobile) ─────────────────────────────────────────────

interface ClassTypesCardListProps {
  classTypes: ClassTypeItem[];
  onEdit: (classType: ClassTypeItem) => void;
  onDelete: (classType: ClassTypeItem) => void;
  onAddPress: () => void;
}

function ClassTypesCardList({ classTypes, onEdit, onDelete, onAddPress }: ClassTypesCardListProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Class Types</Text>
        <TouchableOpacity testID="add-class-type-btn" style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>Add Class Type</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.spaceCardList}>
        {classTypes.map((classType) => (
          <ClassTypeCard key={classType.id} classType={classType} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Fork the populated render on `isMobile`**

Replace the final `return <ClassTypesTable ... />` (after the `classTypes.length === 0` guard). Also remove the `void isMobile;` line if you added one in Task 1 Step 5.

```tsx
  if (isMobile) {
    return (
      <ClassTypesCardList
        classTypes={classTypes}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
        onAddPress={handleAddPress}
      />
    );
  }

  return (
    <ClassTypesTable
      classTypes={classTypes}
      onEdit={handleEditPress}
      onDelete={handleDeletePress}
      onAddPress={handleAddPress}
    />
  );
```

- [ ] **Step 3: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Live check**

Gym Settings → Class Types tab at 390×844.
Expected: class types render as cards (name + "Loggable · Metric: X" + Edit/Delete), not the 4-column table. Desktop table unchanged at ≥1024px.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/gym-settings/ClassTypesTab.tsx
git commit -m "fix(gym-settings): reflow Class Types tab to card list on mobile"
```

---

## Task 3: Schedule Dashboard — day-strip + vertical card list (mobile)

**Design frame:** `gym-owner-screens.pen` node `XbXLT`. A horizontal **day-strip** of 7 day pills (label above date, e.g. "Mon / 21"), the selected day highlighted (dark pill). Below it, a vertical list of **full-width class cards** for the selected day: time (top-left) + `booked/capacity` (top-right), class name, coach line, and a `location · duration min` line. Left color accent per card. This replaces the current horizontal-scroll multi-column `mobileDayColumn` grid.

**Files:**
- Modify: `frontend/app/schedule-dashboard.tsx`
- Modify: `frontend/app/schedule-dashboard.styles.ts`

**Interfaces:**
- Consumes: existing `classesByDay: GymClass[][]` (indexed by `weekDays`), `DAY_LABELS`, `weekDays`, `formatTime`, `getClassColor`, `handleClassPress`. `GymClass = components['schemas']['ClassScheduleItemDto']` — has `scheduledTime`, `classTypeName`, `coachName`, `spaceName`, `duration`, `bookedCount`, `capacity`.
- Produces: new component `MobileDayStrip`, new component `MobileClassCard`, new state `selectedDayIdx: number`. New style keys listed in Step 1.

- [ ] **Step 1: Add mobile day-strip + card styles to `schedule-dashboard.styles.ts`**

Add to the `StyleSheet.create({...})` object:

```ts
  dayStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayPill: {
    minWidth: 44,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  dayPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayPillLabelActive: {
    color: '#FFFFFF',
  },
  dayPillDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  dayPillDateActive: {
    color: '#FFFFFF',
  },
  mobileCardList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  mobileClassCard: {
    borderWidth: 1,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
  },
  mobileClassCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileClassTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  mobileClassCapacity: {
    fontSize: 13,
    color: '#6B7280',
  },
  mobileClassName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  mobileClassMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  mobileEmptyDay: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  mobileEmptyDayText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
```

- [ ] **Step 2: Add `selectedDayIdx` state**

In `ScheduleDashboard`, next to the other `useState` calls (after `viewMode`):

```tsx
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
```

- [ ] **Step 3: Add `MobileDayStrip` and `MobileClassCard` components**

Add above `ScheduleDashboard` (after `ListRow`):

```tsx
// ─── Mobile Day Strip ───────────────────────────────────────────────────────────

interface MobileDayStripProps {
  weekDays: Date[];
  selectedDayIdx: number;
  onSelectDay: (idx: number) => void;
}

function MobileDayStrip({ weekDays, selectedDayIdx, onSelectDay }: MobileDayStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayStrip}>
      {weekDays.map((day, idx) => {
        const isActive = idx === selectedDayIdx;
        return (
          <TouchableOpacity
            key={day.toISOString().slice(0, 10)}
            testID={`day-pill-${idx}`}
            style={[styles.dayPill, isActive && styles.dayPillActive]}
            onPress={() => onSelectDay(idx)}
            activeOpacity={0.8}>
            <Text style={[styles.dayPillLabel, isActive && styles.dayPillLabelActive]}>
              {DAY_LABELS[idx]}
            </Text>
            <Text style={[styles.dayPillDate, isActive && styles.dayPillDateActive]}>
              {day.getDate()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Mobile Class Card (full-width) ─────────────────────────────────────────────

interface MobileClassCardProps {
  gymClass: GymClass;
  colorIndex: number;
  onPress: () => void;
}

function MobileClassCard({ gymClass, colorIndex, onPress }: MobileClassCardProps) {
  const color = getClassColor(colorIndex);
  const isFull = gymClass.bookedCount >= gymClass.capacity;
  const metaParts = [
    gymClass.spaceName,
    gymClass.duration ? `${gymClass.duration} min` : null,
  ].filter(Boolean);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.mobileClassCard, { backgroundColor: color.bg, borderColor: color.border, borderLeftColor: color.time }]}>
      <View style={styles.mobileClassCardTop}>
        <Text style={[styles.mobileClassTime, { color: color.time }]}>{formatTime(gymClass.scheduledTime)}</Text>
        <Text style={[styles.mobileClassCapacity, isFull && styles.classCapacityFull]}>
          {gymClass.bookedCount}/{gymClass.capacity}
        </Text>
      </View>
      <Text style={styles.mobileClassName}>{gymClass.classTypeName}</Text>
      <Text style={styles.mobileClassMeta}>
        {gymClass.coachName ? `Coach: ${gymClass.coachName}` : 'No coach assigned'}
      </Text>
      {metaParts.length > 0 ? (
        <Text style={styles.mobileClassMeta}>{metaParts.join(' · ')}</Text>
      ) : null}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 4: Replace the mobile week-grid branch**

In `renderContent()`, replace the whole `if (isMobile) { return ( <ScrollView horizontal ... mobileGridContainer ...> ... </ScrollView> ); }` block with a day-strip + vertical list for the selected day:

```tsx
    if (isMobile) {
      const dayClasses = classesByDay[selectedDayIdx] ?? [];
      const offset = classesByDay
        .slice(0, selectedDayIdx)
        .reduce((sum, arr) => sum + arr.length, 0);
      return (
        <View style={{ flex: 1 }}>
          <MobileDayStrip
            weekDays={weekDays}
            selectedDayIdx={selectedDayIdx}
            onSelectDay={setSelectedDayIdx}
          />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mobileCardList}>
            {dayClasses.length === 0 ? (
              <View style={styles.mobileEmptyDay}>
                <Text style={styles.mobileEmptyDayText}>No classes scheduled</Text>
              </View>
            ) : (
              dayClasses.map((cls, idx) => (
                <MobileClassCard
                  key={cls.id}
                  gymClass={cls}
                  colorIndex={offset + idx}
                  onPress={() => handleClassPress(cls.id)}
                />
              ))
            )}
          </ScrollView>
        </View>
      );
    }
```

Note: the existing `viewMode === 'list'` branch sits above this and is unchanged — on mobile the Week/List toggle still works; only the "Week" mode's mobile rendering changes.

- [ ] **Step 5: Reset `selectedDayIdx` sensibly on week change (optional guard)**

To avoid an out-of-range index after navigating weeks, the index stays 0–6 and `classesByDay` always has 7 entries, so no reset is required. No change needed — this step is a no-op confirmation.

- [ ] **Step 6: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. If `mobileGridContainer` / `mobileDayColumn` style keys are now unused, that's fine (unused style keys don't fail `tsc`); leave them to keep the diff minimal.

- [ ] **Step 7: Live check**

Owner → Schedule Dashboard (`/schedule-dashboard`) at 390×844, Week mode.
Expected: a horizontal day-strip (7 pills, one highlighted) above a vertical list of full-width class cards for the selected day, each showing time + capacity, name, coach, `space · N min`. Tapping a pill switches the day. Desktop week grid unchanged at ≥1024px.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/schedule-dashboard.tsx frontend/app/schedule-dashboard.styles.ts
git commit -m "fix(schedule-dashboard): mobile day-strip + vertical card list"
```

---

## Task 4: Coach Class Details — compact 2-col info card (mobile)

**Design frame:** `coach-screens.pen` node `gXPN7`. The info card is a compact 2-column grid of label/value pairs (`DATE & TIME` | `SPACE`, then `CAPACITY`), not the current tall single-column stack with a "Class Info" title and one field per row. WOD title/badge sit inline in the header (already present). Programming section below is unchanged.

**Files:**
- Modify: `frontend/app/coach-class-details.tsx` (mobile branch only — the `if (isMobile) { ... }` block, `ms.infoPanel` section)
- Modify: `frontend/app/coach-class-details.styles.ts` (`mobileStyles`: add 2-col grid keys)

**Interfaces:**
- Consumes: existing mobile-branch locals `classTypeName`, `formattedDateTime`, `spaceName`, `bookedCountNum`, `capacityNum`, and the `mark-attendance-nav-btn` handler (unchanged).
- Produces: new `mobileStyles` keys `infoGrid`, `infoGridCell`, `infoGridCellLabel`, `infoGridCellValue`. No cross-task interface.

- [ ] **Step 1: Add 2-col grid styles to `coach-class-details.styles.ts` (`mobileStyles`)**

Add to the `mobileStyles` object:

```ts
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoGridCell: {
    width: '50%',
    marginBottom: 16,
  },
  infoGridCellLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: AppColors.darkTextMuted,
    marginBottom: 4,
  },
  infoGridCellValue: {
    fontSize: 15,
    color: AppColors.darkText,
  },
```

(Use the same color tokens the file's existing `mobileStyles.fieldLabel` / `fieldValue` use — check the top of the styles file and match them; the tokens above assume `AppColors.darkTextMuted` and `AppColors.darkText` as used elsewhere in this screen.)

- [ ] **Step 2: Replace the mobile Info Panel body with a compact 2-col grid**

In `coach-class-details.tsx`, inside `if (isMobile) { ... }`, replace the block from `<Text style={ms.panelTitle}>Class Info</Text>` down through the CAPACITY field (i.e. the four label/value pairs) with a 2-col grid. Keep the `ms.infoPanel` wrapper, the `BOOKED ATHLETES` block, and the `Mark Attendance` button as they are.

Replace:
```tsx
              <Text style={ms.panelTitle}>Class Info</Text>
              <View style={ms.separator} />

              <Text style={ms.fieldLabel}>CLASS TYPE</Text>
              <Text style={ms.fieldValueBold}>{classTypeName ?? '—'}</Text>

              <Text style={ms.fieldLabel}>DATE &amp; TIME</Text>
              <Text style={ms.fieldValue}>{formattedDateTime}</Text>

              <Text style={ms.fieldLabel}>SPACE</Text>
              <Text style={ms.fieldValue}>{spaceName ?? '—'}</Text>

              <Text style={ms.fieldLabel}>CAPACITY</Text>
              <Text style={ms.fieldValue}>{bookedCountNum} booked / {capacityNum} spots</Text>

              <View style={[ms.separator, ms.separatorSpacing]} />
```
with:
```tsx
              <View style={ms.infoGrid}>
                <View style={ms.infoGridCell}>
                  <Text style={ms.infoGridCellLabel}>CLASS TYPE</Text>
                  <Text style={ms.infoGridCellValue}>{classTypeName ?? '—'}</Text>
                </View>
                <View style={ms.infoGridCell}>
                  <Text style={ms.infoGridCellLabel}>DATE &amp; TIME</Text>
                  <Text style={ms.infoGridCellValue}>{formattedDateTime}</Text>
                </View>
                <View style={ms.infoGridCell}>
                  <Text style={ms.infoGridCellLabel}>SPACE</Text>
                  <Text style={ms.infoGridCellValue}>{spaceName ?? '—'}</Text>
                </View>
                <View style={ms.infoGridCell}>
                  <Text style={ms.infoGridCellLabel}>CAPACITY</Text>
                  <Text style={ms.infoGridCellValue}>{bookedCountNum} / {capacityNum} booked</Text>
                </View>
              </View>

              <View style={[ms.separator, ms.separatorSpacing]} />
```

- [ ] **Step 3: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Live check**

Coach → a class → Class Details at 390×844. (Log in as `coach@example.com` / `password123`, open My Classes, tap a class.)
Expected: the info card is a compact 2×2 grid (Class Type / Date & Time on row 1, Space / Capacity on row 2), not a tall single-column list with a "Class Info" heading. Mark Attendance button + Programming section still present below. Desktop layout unchanged at ≥1024px.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/coach-class-details.tsx frontend/app/coach-class-details.styles.ts
git commit -m "fix(coach-class-details): compact 2-col info grid on mobile"
```

---

## Task 5: Coach Mark Attendance — drop stat tiles + STATUS row; add Select All + footer (mobile)

**Design frame:** `coach-screens.pen` node `PWqpG`. Mobile = a subheader (`WOD — <date>` on one line, `N athletes booked` + a **Select All** control), then avatar rows (avatar + name + a present/absent toggle switch), then a footer `X of Y marked present` and a full-width **Save Attendance** button. There is NO info card with a STATUS row and NO Booked/Present/Absent stat tiles.

**Files:**
- Modify: `frontend/app/coach-mark-attendance.tsx` (mobile branch only)
- Modify: `frontend/app/coach-mark-attendance.styles.ts` (`mobileStyles`: add subheader / select-all / footer keys)

**Interfaces:**
- Consumes: existing `slots`, `markedPresentCount`, `handleToggle`, `handleSubmit`, `isSubmitting`, `isLoadingBookings`, `bookingsError`, `MobileAthleteRow`, `headerTitle`. `bookedCountNum`.
- Produces: a new handler `handleSelectAll` (marks every slot present), new `mobileStyles` keys `subHeader`, `subHeaderTitle`, `subHeaderRow`, `subHeaderCount`, `selectAllBtn`, `selectAllText`, `footerRow`, `footerCountText`.

- [ ] **Step 1: Add `handleSelectAll` to the screen**

After `handleToggle` in `CoachMarkAttendanceScreen`:

```tsx
  const allPresent = slots.length > 0 && slots.every((s) => s.present);

  const handleSelectAll = () => {
    setSlots((prev) => prev.map((s) => ({ ...s, present: !allPresent })));
    setSuccessMessage(null);
    setSubmitError(null);
  };
```

(Toggles all-present ↔ all-absent, so the control also works as "Deselect All" once everyone is present.)

- [ ] **Step 2: Add subheader / select-all / footer styles to `coach-mark-attendance.styles.ts` (`mobileStyles`)**

```ts
  subHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  subHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.darkText,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  subHeaderCount: {
    fontSize: 13,
    color: AppColors.darkTextMuted,
  },
  selectAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.darkText,
  },
  footerRow: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerCountText: {
    fontSize: 14,
    color: AppColors.darkTextMuted,
  },
```

(Match the `AppColors.*` tokens already used in this file's `mobileStyles`; adjust names if the file uses different ones.)

- [ ] **Step 3: Rewrite the mobile branch layout**

In the `if (isMobile) { ... }` block, replace the **Info Card** (`ms.infoCard`) and the **Summary stat cards** (`ms.statsRow` with the three `StatCard`s) with a subheader containing the Select All control. Keep the header (back + title), the attendance list rows, feedback banners, and change the submit area to include the footer count.

Replace this span:
```tsx
          {/* Info Card */}
          <View style={ms.infoCard}>
            ...
          </View>

          {/* Summary stat cards */}
          <View style={ms.statsRow}>
            <StatCard ... />
            <StatCard ... />
            <StatCard ... />
          </View>

          {/* Attendance card */}
          <View style={ms.attendanceCard}>
            {/* Section header */}
            <View style={ms.sectionHeader}>
              <Text style={ms.sectionTitle}>Attendance List</Text>
              <View style={ms.sectionBadge}>
                <Text style={ms.sectionBadgeText}>{isLoadingBookings ? bookedCountNum : slots.length} booked</Text>
              </View>
            </View>
```
with:
```tsx
          {/* Subheader with Select All */}
          <View style={ms.subHeader}>
            <View style={ms.subHeaderRow}>
              <Text style={ms.subHeaderCount}>
                {isLoadingBookings ? bookedCountNum : slots.length} athletes booked
              </Text>
              {slots.length > 0 && !isLoadingBookings ? (
                <TouchableOpacity
                  testID="select-all-btn"
                  style={ms.selectAllBtn}
                  onPress={handleSelectAll}
                  activeOpacity={0.8}>
                  <Text style={ms.selectAllText}>{allPresent ? 'Deselect All' : 'Select All'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Attendance card */}
          <View style={ms.attendanceCard}>
```

- [ ] **Step 4: Add the footer count above the Save button**

Immediately before the mobile `{/* Submit */}` block (the `slots.length > 0 && !isLoadingBookings && (...)` with `submit-attendance-btn`), insert the footer count:

```tsx
            {slots.length > 0 && !isLoadingBookings ? (
              <View style={ms.footerRow}>
                <Text style={ms.footerCountText}>
                  {markedPresentCount} of {slots.length} marked present
                </Text>
              </View>
            ) : null}
```

- [ ] **Step 5: Remove the now-unused mobile `StatCard` import path**

`StatCard` is still used by the desktop branch, so keep the component. Just confirm the mobile branch no longer references `ms.statCard`/`ms.statsRow`/`ms.infoCard`/`ms.infoItem`/`ms.sectionHeader` if you removed them — leaving unused style keys is fine; do NOT delete keys the desktop branch (`styles.*`) uses. `formatDateTime` is still used by `headerTitle`, keep it.

- [ ] **Step 6: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. (If `noUnusedLocals`/`noUnusedParameters` flags `StatCard`'s `isMobile` prop path — it's still used by desktop, so no issue.)

- [ ] **Step 7: Live check**

Coach → class → Mark Attendance at 390×844 (a class in a state that has bookings; use `coach@example.com`).
Expected: subheader (`N athletes booked` + Select All), avatar rows with present/absent toggle, footer `X of Y marked present`, Save Attendance button. NO STATUS row, NO Booked/Present/Absent tiles. Select All flips all toggles. Desktop unchanged at ≥1024px (still shows info card + stat cards + table).

- [ ] **Step 8: Commit**

```bash
git add frontend/app/coach-mark-attendance.tsx frontend/app/coach-mark-attendance.styles.ts
git commit -m "fix(mark-attendance): mobile subheader + Select All + footer, drop stat tiles"
```

---

## Task 6: Class Management — 3-tab bar (Info | Bookings | Results) on mobile

**Design frame:** `gym-owner-screens.pen` node `7iKEc`. Mobile has a **3-tab bar** `Info | Bookings | Results`. The **Info** tab holds a compact 2-col info card (Class Type/Duration, Coach/Capacity, Space) followed by the action buttons (Mark Attendance, Add Programming — and Edit). Currently the mobile layout shows the wide info card + action row ALWAYS (above a 2-tab `Bookings | Results` bar). This task moves the info card + actions into a new first tab and hides the always-shown copy on mobile.

**Files:**
- Modify: `frontend/app/class-management/index.tsx` (add `info` to the mobile tab bar; render `ClassHeader`'s info+actions only inside the Info tab on mobile)
- Modify: `frontend/app/class-management/ClassHeader.tsx` (split so the title/state row stays always-visible, but the InfoCard + action row can render inside a tab; expose a mobile-friendly compact variant)
- Modify: `frontend/app/class-management/class-management.styles.ts` (compact 2-col info grid for mobile; 3-tab widths already flex)

**Interfaces:**
- Consumes: `MobileTab = 'info' | 'bookings' | 'results'` (already declared), `mobileTab` state (already `'info'` default), `classDetail`, `isTransitioning`, `handleTransition`, `handleMarkAttendance`, `handleAddProgramming`, `handleEditClass`. `ClassDetail = components['schemas']['ClassScheduleItemDto']` — `classTypeName`, `coachName`, `duration`, `bookedCount`, `capacity`, `spaceName`, `scheduledDate`, `scheduledTime`, `state`.
- Produces: `ClassHeader` split into `ClassTitleRow` (title + `StateBadge`, always shown) and `ClassInfoAndActions` (InfoCard + action row, shown in Info tab on mobile / inline on desktop). A new exported `MobileClassInfoCard` compact grid. New style keys `mobileInfoGrid`, `mobileInfoGridCell`, `mobileInfoGridLabel`, `mobileInfoGridValue`.

- [ ] **Step 1: Add a compact 2-col info grid + refactor `ClassHeader.tsx`**

Split the current `ClassHeader` so the title/state row is separable from the info-card + actions. Add a compact mobile info card. Replace the `ClassHeader` export with three exports:

```tsx
// ─── Class Title Row (always shown) ─────────────────────────────────────────────

interface ClassTitleRowProps {
  classDetail: ClassDetail;
  isTransitioning: boolean;
  onTransition: () => void;
}

export function ClassTitleRow({ classDetail, isTransitioning, onTransition }: ClassTitleRowProps) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{classDetail.classTypeName}</Text>
        <Text style={styles.headerSubtitle}>
          {formatDateSubtitle(classDetail.scheduledDate, classDetail.scheduledTime)}
        </Text>
      </View>
      <StateBadge
        state={classDetail.state}
        isTransitioning={isTransitioning}
        onPress={onTransition}
      />
    </View>
  );
}

// ─── Mobile Info Card (compact 2-col) ───────────────────────────────────────────

export function MobileClassInfoCard({ classDetail }: { classDetail: ClassDetail }) {
  const items: { label: string; value: string }[] = [
    { label: 'CLASS TYPE', value: classDetail.classTypeName },
    { label: 'DURATION', value: `${classDetail.duration} min` },
    { label: 'COACH', value: classDetail.coachName || '—' },
    { label: 'CAPACITY', value: `${classDetail.bookedCount} / ${classDetail.capacity}` },
    { label: 'SPACE', value: classDetail.spaceName || '—' },
  ];
  return (
    <View style={styles.mobileInfoGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.mobileInfoGridCell}>
          <Text style={styles.mobileInfoGridLabel}>{item.label}</Text>
          <Text style={styles.mobileInfoGridValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Action Row ─────────────────────────────────────────────────────────────────

interface ClassActionsProps {
  onMarkAttendance: () => void;
  onAddProgramming: () => void;
  onEditClass: () => void;
}

export function ClassActions({ onMarkAttendance, onAddProgramming, onEditClass }: ClassActionsProps) {
  return (
    <View style={styles.actionRow}>
      <TouchableOpacity testID="mark-attendance-btn" style={styles.primaryBtn} onPress={onMarkAttendance}>
        <Text style={styles.primaryBtnText}>MARK ATTENDANCE</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="add-programming-btn" style={styles.outlinedBtn} onPress={onAddProgramming}>
        <Text style={styles.outlinedBtnText}>ADD PROGRAMMING</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="edit-class-btn" style={styles.outlinedBtn} onPress={onEditClass}>
        <Text style={styles.outlinedBtnText}>EDIT</Text>
      </TouchableOpacity>
    </View>
  );
}
```

Keep the existing `ClassHeader` export too, re-composed from the pieces so the desktop path is byte-for-byte the same rendering:

```tsx
export function ClassHeader({
  classDetail,
  isTransitioning,
  onTransition,
  onMarkAttendance,
  onAddProgramming,
  onEditClass,
}: ClassHeaderProps) {
  return (
    <>
      <ClassTitleRow classDetail={classDetail} isTransitioning={isTransitioning} onTransition={onTransition} />
      <InfoCard classDetail={classDetail} />
      <ClassActions
        onMarkAttendance={onMarkAttendance}
        onAddProgramming={onAddProgramming}
        onEditClass={onEditClass}
      />
    </>
  );
}
```

- [ ] **Step 2: Add compact grid styles to `class-management.styles.ts`**

```ts
  mobileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mobileInfoGridCell: {
    width: '50%',
    marginBottom: 14,
  },
  mobileInfoGridLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: '#6B7280',
    marginBottom: 4,
  },
  mobileInfoGridValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
```

- [ ] **Step 3: Update `index.tsx` — desktop uses `ClassHeader`; mobile uses title row + 3-tab bar**

Update imports:
```tsx
import { ClassHeader, ClassTitleRow, MobileClassInfoCard, ClassActions } from './ClassHeader';
```

Replace the block that renders `<ClassHeader .../>` followed by the mobile/desktop content fork. On desktop, keep `ClassHeader` + `listsRow` exactly as now. On mobile, render `ClassTitleRow` (always), then the 3-tab bar, then the active tab body:

```tsx
          <>
            {isMobile ? (
              <ClassTitleRow
                classDetail={classDetail}
                isTransitioning={isTransitioning}
                onTransition={handleTransition}
              />
            ) : (
              <ClassHeader
                classDetail={classDetail}
                isTransitioning={isTransitioning}
                onTransition={handleTransition}
                onMarkAttendance={handleMarkAttendance}
                onAddProgramming={handleAddProgramming}
                onEditClass={handleEditClass}
              />
            )}

            {isLoadingBookings || isLoadingResults ? (
              <View style={styles.centeredFeedback}>
                <ActivityIndicator size="small" color={AppColors.textMuted} />
              </View>
            ) : bookingsError || resultsError ? (
              <View style={styles.centeredFeedback}>
                {bookingsError ? (
                  <>
                    <Text style={styles.errorText}>{bookingsError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchBookings}>
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {resultsError ? (
                  <>
                    <Text style={styles.errorText}>{resultsError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchResults}>
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : isMobile ? (
              /* Mobile: 3-tab interface Info | Bookings | Results */
              <View style={styles.mobileTabsContainer}>
                <View style={styles.mobileTabBar}>
                  <TouchableOpacity
                    style={[styles.mobileTab, mobileTab === 'info' && styles.mobileTabActive]}
                    onPress={() => setMobileTab('info')}>
                    <Text style={[styles.mobileTabText, mobileTab === 'info' && styles.mobileTabTextActive]}>
                      Info
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mobileTab, mobileTab === 'bookings' && styles.mobileTabActive]}
                    onPress={() => setMobileTab('bookings')}>
                    <Text style={[styles.mobileTabText, mobileTab === 'bookings' && styles.mobileTabTextActive]}>
                      Bookings
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mobileTab, mobileTab === 'results' && styles.mobileTabActive]}
                    onPress={() => setMobileTab('results')}>
                    <Text style={[styles.mobileTabText, mobileTab === 'results' && styles.mobileTabTextActive]}>
                      Results
                    </Text>
                  </TouchableOpacity>
                </View>
                {mobileTab === 'info' ? (
                  <View>
                    <MobileClassInfoCard classDetail={classDetail} />
                    <ClassActions
                      onMarkAttendance={handleMarkAttendance}
                      onAddProgramming={handleAddProgramming}
                      onEditClass={handleEditClass}
                    />
                  </View>
                ) : mobileTab === 'bookings' ? (
                  <BookingsPanel bookedList={bookedList} waitlistedList={waitlistedList} />
                ) : (
                  <ResultsPanel results={results} />
                )}
              </View>
            ) : (
              <View style={styles.listsRow}>
                <BookingsPanel bookedList={bookedList} waitlistedList={waitlistedList} />
                <ResultsPanel results={results} />
              </View>
            )}
          </>
```

- [ ] **Step 4: Confirm DEFERRED carve-out**

`MobileClassInfoCard` renders only Class Type / Duration / Coach / Capacity / Space — no membership-plan field. Confirm no plan data is added. (No code change; this is the guard check.)

- [ ] **Step 5: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Live check**

Owner → Schedule Dashboard → tap a class → Class Management at 390×844.
Expected: a 3-tab bar `Info | Bookings | Results`. Info tab shows the compact 2-col info card + Mark Attendance / Add Programming / Edit buttons. The wide always-shown info card is gone on mobile. Bookings/Results tabs work as before. Desktop layout (side-by-side Bookings + Results with the full `ClassHeader`) unchanged at ≥1024px.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/class-management/index.tsx frontend/app/class-management/ClassHeader.tsx frontend/app/class-management/class-management.styles.ts
git commit -m "fix(class-management): 3-tab mobile layout with Info tab"
```

---

## Post-implementation (after all 6 tasks verified by the user)

Not plan tasks — tracked here so they aren't forgotten:
- **Trello:** move cards `6a70cd64`, `6a70cdba`, `6a70ce53`, `6a70d0f3`, `6a70d10c` through 🔍 To Verify with commit refs; the user self-verifies live → ✅ Verified. Mark the stale athlete-header card `6a70c8f2` accordingly (not a real gap).
- **PROJECT_STATE.md:** add a "🐞 Tier-2 mobile-reflow family → Verified" batch entry with the commit refs.

## Self-Review

**Spec coverage:**
- Spec 1a Gym Settings Spaces → Task 1 ✅; 1a Class Types → Task 2 ✅ (spec groups both under Gym Settings; split into two tasks for independent review).
- Spec 1b Schedule Dashboard → Task 3 ✅.
- Spec 2a Coach Class Details → Task 4 ✅.
- Spec 2b Mark Attendance → Task 5 ✅.
- Spec 3 Class Management 3-tab → Task 6 ✅.
- Spec "keep inline MOBILE_BREAKPOINT" → Global Constraints ✅. Spec "desktop untouched" → Global Constraints + every task's live-check step ✅. Spec DEFERRED plans → Global Constraints + Task 6 Step 4 ✅. Spec out-of-scope data bugs → Global Constraints ✅. Spec ProfileTab "verify not width-locked" → it's already a form with no table; no task needed (noted here, no change).

**Placeholder scan:** no TBD/TODO; every code step has concrete code. Style token names in Tasks 4 & 5 are flagged to be matched against the file's existing `AppColors.*`/`mobileStyles` usage rather than invented — that's an explicit instruction, not a placeholder.

**Type consistency:** `SpacesTab`/`ClassTypesTab` gain `isMobile: boolean` (Task 1 defines, Task 1/2 consume). `MobileTab` already `'info' | 'bookings' | 'results'` with `'info'` default — Task 6 relies on that, consistent. `ClassHeader` split exports (`ClassTitleRow`, `MobileClassInfoCard`, `ClassActions`) defined in Task 6 Step 1 and imported in Step 3 — names match. `GymClass`/`ClassDetail`/`SpaceItem`/`ClassTypeItem` all reference existing generated schema types.
