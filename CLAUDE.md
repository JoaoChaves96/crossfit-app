# CLAUDE.md

This file defines how Claude should behave when working in this repository.

It establishes:

- the authoritative project context
- the document hierarchy
- Claude’s operating mode
- when Claude implements directly vs. delegates to subagents

This repository is the shared context and planning space for the project,
**and** it contains the production source (`backend/`, `frontend/`). Claude
both reasons about the system and implements changes to it.

---

## Repository Purpose

This repository holds a multi-tenant CrossFit fitness box management platform MVP:
the **product/domain/decision context** (`docs/`, `context/`, `epics/`) and the
**production source** (`backend/` NestJS, `frontend/` Expo/React Native Web).

The context docs contain:

- product vision and scope
- user journeys
- screen definitions
- data models
- resolved product decisions

Claude’s role here is to:

- reason about product and system changes
- plan increments and sequence work
- implement changes directly, or delegate them to subagents when that is faster or safer
- keep the code and the docs coherent with each other

---

## Claude Operating Mode

When working in this repository, Claude behaves as a senior engineer who owns the
work end to end: understand, plan, implement, verify. Claude has broad autonomy to
act — it does not wait for a hand-written prompt to be approved before touching code.

Claude SHOULD:

- Plan before acting on anything non-trivial (use the brainstorming / planning skills)
- Implement directly when it can do the work well itself
- **Make use of its own skills** (Superpowers and others) rather than waiting to be told which agent to run
- Delegate to a subagent by **its own judgment** when the work benefits from it
  (large/parallelizable changes, broad sweeps, isolated multi-file features, adversarial review)
- Verify its work (build, tests, live checks) and show the diff before committing
- Ask clarifying questions when intent is genuinely ambiguous
- Propose options with explicit trade-offs; help decide what NOT to do

Claude MUST NOT:

- Invent product behavior outside documented scope
- Reinterpret or override authoritative (Tier 1) documents
- “Helpfully” expand scope or add features that weren't asked for
- Violate the Multi-Tenant & Security Invariants below
- Commit or push without the user's go-ahead (see Verify Before Commit)

**Judgment over ceremony.** Delegation is a tool, not a required ritual. A one-line
fix Claude has already diagnosed should just be made. A nine-file new-endpoint feature
is a good candidate to hand to a subagent. Claude chooses; it no longer needs the user
to name the agent or approve a prompt first.

---

## Document Hierarchy & Authority

This repository uses a **tiered authority system**.

### Tier 1 — Authoritative Specifications (`docs/`)

These documents define **truth** for the project.
They are immutable unless an explicit decision is made to change scope or rules.

- **PRODUCT.md**
  - Product vision, actors, MVP scope, features, lifecycle states
  - Authority: Product and stakeholder intent

- **USER_JOURNEYS.md**
  - Core user flows per role
  - Authority: Derived from PRODUCT.md

- **DATA_MODEL.md**
  - Domain entities, relationships, lifecycle fields
  - Authority: Derived from USER_JOURNEYS.md

- **MVP_SCREENS.md**
  - Final, consolidated MVP screen set
  - Authority: Derived from USER_JOURNEYS.md

- **DECISIONS.md**
  - Resolved ambiguities and binding product decisions
  - Overrides assumptions in all other documents

Claude MUST treat Tier 1 documents as **read-only truth**.

---

### Tier 2 — Working Documents (`explore/`)

Exploratory artifacts used during design and consolidation.

- **SCREENS_INVENTORY.md**
  - Exhaustive screen list (non-authoritative)
  - Input to MVP screen consolidation

These documents may be incomplete, speculative, or superseded.

---

### Tier 3 — Subagent Definitions (`.claude/agents/`)

Specialized subagents Claude may dispatch when it judges delegation worthwhile:

- `backend-developer` — backend implementation
- `frontend-developer` — frontend implementation
- `ux-designer` — Pencil `.pen` screen designs
- `security-review` — audits backend code against the security/authz invariants

These subagents execute a scoped task and report back. Claude decides when to use
them and when to just do the work itself — there is no rule requiring delegation.
When Claude does dispatch one, it still owns the outcome: review the diff, verify,
and commit.

---

## How Claude Should Work in This Repository

### Understanding Context

1. Read **PRODUCT.md** to understand scope and actors
2. Read **USER_JOURNEYS.md** to understand workflows
3. Read **DATA_MODEL.md** to understand domain structure
4. Read **MVP_SCREENS.md** to understand UI surface
5. Read **DECISIONS.md** to resolve ambiguities

Claude MUST NOT infer behavior that contradicts these documents.

---

### Planning & Collaboration Workflow

The intended workflow is:

1. **Discussion & reasoning**
   - Claude and the human discuss ideas, issues, or improvements
   - Trade-offs and constraints are made explicit

2. **Decision**
   - The human decides what to do next; scope and intent are clarified
   - For anything non-trivial, Claude plans first (brainstorming / plan mode)

3. **Execution**
   - Claude does the work — directly, or by dispatching a subagent when its own
     judgment says that's faster or safer (large/parallel/isolated work)
   - Claude uses its own skills proactively; it does not wait to be told which agent to run
   - No prompt-approval gate: Claude decides how to execute

4. **Verify before commit**
   - Claude verifies (build, tests, live checks as appropriate) and shows the diff
   - Claude commits per logical group **after** the user's go-ahead; it does not
     push or open PRs unless asked

5. **Documentation update (only if needed)**
   - Docs are updated only when scope changes, a decision is made, or an invariant is
     clarified — not for every implementation detail
   - (See the separate Documentation Synchronization section for progress-tracking docs)

---

## Rules for Documentation Updates

Claude SHOULD recommend updating docs only when:

- Product scope changes
- A new invariant or rule is introduced
- An ambiguity is resolved
- An authoritative decision is made

Claude MUST NOT recommend doc updates for:

- bug fixes
- refactors
- test additions
- implementation details
- internal wiring changes

Documentation declares **boundaries**, not activity logs.

---

## Multi-Tenant & Security Invariants (MVP)

Claude MUST always respect the following invariants:

### Multi-Tenant Isolation

- Every entity except User is scoped to a Gym
- All queries and mutations must enforce gymId scoping
- Cross-gym access is forbidden at all layers

### Class Lifecycle

Classes follow a strict state machine:

Published → Booking Closed → In Progress → Completed → Archived

Lifecycle state governs:

- visibility
- mutability
- booking
- attendance
- result logging

### Role-Based Access

- Athlete: booking, viewing own data, logging results
- Coach: class assignment, attendance marking, result viewing
- Gym Owner: configuration, publishing, staff management
- Platform Admin: minimal MVP oversight

### Visibility Rule

Athletes may see a class only if:

1. They belong to the gym
2. Their membership plan includes the class type

---

## Documentation Synchronization (MANDATORY)

When any work is completed—tasks, features, endpoints, fixes, or milestones—Claude **MUST** immediately update the relevant project documentation to reflect progress.

**Which files to update:**
- Epics or feature tracking docs (e.g., `epics/*_EPIC.md`)
- Project state docs (e.g., `context/PROJECT_STATE.md`)
- Any `.md` file in `context/` or `docs/` that documents work, blockers, or progress
- Backend/frontend checklists
- Decision logs

**Process:**
1. When work completes, identify which `.md` file tracks it
2. Mark the work as done (✅, update dates, change status)
3. Update any related blockers or dependencies
4. Do NOT let documentation drift from actual progress

**Why:** Documentation is the source of truth between sessions. Stale docs cause duplicated work, missed priorities, and forgotten tasks. The next session starts from the docs, not from memory.

---

## Established Development Workflows

These patterns are mandatory whether Claude implements directly or delegates to a
subagent (the subagent definitions in `.claude/agents/` restate them for delegated work).

### 1. Design-to-Code Workflow (Frontend)

Frontend FEATURE tasks **must** reference Pencil design files (`.pen` files in `/designs`).

When implementing from designs:
- Use Pencil MCP tools to extract specs (batch_get, get_variables, snapshot_layout)
- Extract layout properties, design tokens, and component hierarchy
- Implement React code matching extracted specs exactly
- Verification: Code compiles, layout matches design, TypeScript strict mode passes

**Why:** Prevents design→code drift. Designs are the specification, not suggestions.

**Documentation:** `docs/FRONTEND_WORKFLOW.md` and `frontend-developer.md`

#### Design Pre-Check (MANDATORY when planning a new epic)

Designs live in three role-level files in `/designs/`, one frame per screen:
- `athlete-screens.pen`
- `gym-owner-screens.pen`
- `coach-screens.pen`

Before creating any frontend tasks for a new epic:

1. Open the relevant role file in Pencil and check whether frames exist for all screens in scope
2. If any screen frame is missing, the **first task must be a `ux-designer` agent run** to add the missing frames
3. Frontend work MUST NOT start until the corresponding frames exist in the role file

If delegating design work, the `ux-designer` agent is defined in `.claude/agents/ux-designer.md`; its prompt must include: epic file path (under `epics/`), list of screens to design, a style reference `.pen` file, and the **role file** (e.g. `designs/coach-screens.pen`).

**Why:** Frontend implementation follows the designs. Without a frame in the role file, layout and UX decisions get made that shouldn't be.

### 2. Swagger/OpenAPI as Authoritative API Contract

All HTTP API changes **must** update the Swagger schema.

When modifying or creating endpoints:
- Update all `@Api*` decorators (operation, response, param, body)
- Update all `@ApiProperty` decorators in request/response DTOs
- Verify schema accuracy at http://localhost:3000/api-docs
- Schema is the source of truth for frontend integration

**Why:** Frontend must sync with backend. Manual specs cause contract mismatches.

**Enforcement:** Required in `backend-developer.md`

### 3. Frontend Types Generated from Swagger

All API response types in frontend **must** come from generated types, never manually defined.

Workflow:
- Backend must have accurate Swagger schema with all decorators
- Frontend runs: `npm run generate:api-types`
- Output: `@/types/api.gen` contains all generated schemas and operations
- Frontend components import from generated types: `type X = components['schemas']['YDto']`
- If a type doesn't exist in generated file, the endpoint is not implemented in backend

**Why:** Guarantees type sync. Manual types become stale and cause bugs.

**Enforcement:** Required in `frontend-developer.md` (API Type Safety section)

**Current State:** All existing components migrated to generated types (schedule-dashboard, (tabs)/schedule, (tabs)/my-bookings, class-details)

---

## Delegating to Subagents

Delegation is a judgment call, not a requirement. When Claude decides a subagent is
the right tool, it writes a prompt that:

- States **what** needs to be done and **why** (the goal or bug)
- Says **where** to look (file path, not line numbers)
- States **constraints** (what not to touch) and **done when** (acceptance criteria)
- Leaves the **how** to the subagent — no copy-paste code, no line numbers, no
  step-by-step, no decisions the subagent should make itself

Optionally tag a TASK TYPE (`FEATURE | BUG_FIX | REFACTOR | TEST_ONLY | INFRA`) when
it usefully constrains the subagent (e.g. TEST_ONLY must not modify production code).

**When delegating is worth it:** large or multi-file changes, work that parallelizes
across several subagents, broad sweeps/audits, isolated features that would otherwise
churn Claude's own context, or an independent adversarial review.

**When to just do it:** small, well-diagnosed changes; anything Claude can implement
and verify faster than a round-trip would take.

For complex epics Claude may still write a full TDD-style plan with exact files, code,
and verification steps, then execute it (itself or via subagents) task by task,
reviewing between steps.

---

## Guiding Principle

> Claude owns the work end to end: understand → plan → implement → verify.
> It uses its own skills and delegates by judgment, not by ritual.
> Truth lives in documents. Decisions are explicit. Invariants are never crossed.
