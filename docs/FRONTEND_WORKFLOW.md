# Frontend Workflow: Design → Code

## Overview

This document describes how frontend development works in this project:

**Design is the source of truth** → Pencil `.pen` files define all screens  
**Code is generated from design** → Frontend agent extracts specs and implements React code  
**Specs are programmatic** → No manual translation, no guessing

---

## Workflow Process

### Step 1: Design File (Pencil)

- Designer creates each screen as a named **frame** inside a role-level `.pen` file
- Three role files live in `/designs/`:
  - `athlete-screens.pen` — all athlete screens
  - `gym-owner-screens.pen` — all gym owner screens
  - `coach-screens.pen` — all coach screens
- Each file contains:
  - One top-level frame per screen (frame name = screen name)
  - Layout hierarchy (frames, components, groups)
  - Design tokens (colors, typography, spacing via variables)
  - Component instances and customizations
  - Visual specs (dimensions, padding, gaps)

### Step 2: Extract Design Specs (Frontend Agent via Pencil MCP)

Frontend agent uses **Pencil MCP tools** to read the design:

```
1. mcp__pencil__open_document("/designs/<role>-screens.pen")
2. mcp__pencil__batch_get() — list top-level frames, locate the target screen by frame name
3. mcp__pencil__get_variables() — extract design tokens (colors, fonts, spacing)
4. mcp__pencil__snapshot_layout(frameId) — understand layout structure of target frame
```

**Output:** Design specs in structured format:
- Frame hierarchy and layout (flexbox properties)
- Component instances and their overrides
- Design tokens (color codes, font sizes, spacing values)
- Text content and styling
- Responsive behavior

### Step 3: Implement React Code (Frontend Agent)

Frontend agent implements React/TypeScript code using extracted specs:

```typescript
// Based on extracted specs:
// - Layout: vertical frame, gap: 16, padding: 24
// - Colors: primary #3B82F6 (from variables)
// - Typography: fontSize: 18, fontWeight: 600

export function ScheduleDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Schedule Dashboard</Text>
      {/* ... component implementation ... */}
    </View>
  );
}
```

**Implementation guidelines:**
- Use extracted specs as source of truth (not guessing)
- Match layout hierarchy from design
- Use extracted color/typography values
- Keep code idiomatic to the project (React Native, TypeScript, Expo)
- No design system reinvention — use what design extracted

### Step 4: Integration

Frontend agent:
- Writes code to codebase
- Registers routes in navigation
- Passes TypeScript checks
- Runs locally without errors

---

## Pencil MCP Tools Reference

| Tool | Purpose |
|------|---------|
| `open_document(path)` | Open a `.pen` file |
| `get_editor_state()` | Current editor state and available components |
| `batch_get(patterns, nodeIds)` | Read design nodes and structure |
| `get_variables()` | Extract design tokens (colors, fonts, spacing) |
| `snapshot_layout(parentId)` | Understand layout/spacing structure |
| `get_screenshot(nodeId)` | Visual verification of design |

---

## Example: Schedule Dashboard

### Design File
- `designs/gym-owner-screens.pen`, frame: `Class Management`

### Extraction (Pencil MCP)
```
open → gym-owner-screens.pen
batch_get() → list top-level frames, find "Class Management" frame
get_variables() → returns color palette, typography, spacing tokens
snapshot_layout("class-management-frame-id", maxDepth: 2) → returns layout structure
```

**Extracted Specs:**
```
- Container: vertical frame
  - Gap: 16px
  - Padding: 24px all sides
  - Background: white
  
- Header section:
  - Title: "Schedule Dashboard"
    - fontSize: 24px, fontWeight: 600, color: #1F2937
  - Subtitle: "Manage your class schedule"
    - fontSize: 14px, color: #6B7280
  
- Classes grid:
  - Layout: horizontal wrap
  - Item: Card component instance
    - Width: 280px, Height: auto
    - Gap: 12px between items
    
- Design tokens:
  - color.primary: #3B82F6
  - color.text.primary: #1F2937
  - spacing.sm: 8px
  - spacing.md: 16px
  - font.body.size: 14px
```

### Implementation (React)
```typescript
export function ScheduleDashboard() {
  return (
    <View style={{ gap: 16, padding: 24 }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#1F2937' }}>
          Schedule Dashboard
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          Manage your class schedule
        </Text>
      </View>
      
      <FlatList
        data={classes}
        renderItem={({ item }) => <ClassCard class={item} />}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
      />
    </View>
  );
}
```

---

## Task Structure

Every frontend task referencing a design includes:

```
DESIGN REFERENCE: designs/<role>-screens.pen — frame: "<Screen Name>"

AGENT WORKFLOW:
1. Open the role-level .pen file using Pencil MCP
2. Locate the target frame by name using batch_get()
3. Extract design specs (layout, colors, typography, components)
4. Implement React/TypeScript code based on specs
5. Register route and test locally

SPECS TO EXTRACT:
- Layout structure and flexbox properties
- Design tokens (colors, fonts, spacing)
- Component instances and customizations
- Text content and styling
- Responsive behavior
```

---

## Benefits

✅ **Design-driven development** — Code follows design, not vice versa  
✅ **No manual translation** — Specs extracted programmatically  
✅ **Consistency** — Same process for every screen  
✅ **Maintainability** — Design changes → easy code updates  
✅ **Scalability** — All screens follow same workflow  

---

## When Design Changes

If a design is updated in Pencil:

1. Designer updates the relevant frame inside `/designs/<role>-screens.pen`
2. Frontend agent re-extracts specs via Pencil MCP
3. Regenerates/updates React code based on new specs
4. No manual design-to-code translation needed

---

## Reference Docs

- **Design System:** `PENCIL_DESIGN_CODE.md` (design ↔ code patterns)
- **Agent Rules:** `.claude/agents/frontend-developer.md` (execution constraints)
- **Product Spec:** `docs/MVP_SCREENS.md` (what screens should do)
- **User Journeys:** `docs/USER_JOURNEYS.md` (user flows)
