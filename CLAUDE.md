# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Repository Purpose

This is a **product design repository** for a multi-tenant CrossFit fitness box management platform MVP. It contains authoritative product documentation, user journeys, screen designs, and data models—but **no source code**. All work here involves maintaining and evolving design specifications, not implementing code.

---

## Document Hierarchy & Authority

This repository uses a **tiered authority system** for all documents:

### Tier 1: Authoritative Specifications (docs/)

These documents define the MVP scope, rules, and constraints. They are read-only inputs to design decisions.

- **PRODUCT.md** — Product vision, actors (Athlete, Gym Owner, Coach, Platform Admin), MVP scope, features, and class lifecycle states
  - Start here to understand what the product does and who uses it
  - Authority: Stakeholders and product requirements

- **USER_JOURNEYS.md** — Primary user flows for each role (Athlete book→attend→log; Gym Owner configure→publish; Coach assign→mark attendance)
  - Describes the happy path for core features
  - Authority: Product design; derived from PRODUCT.md

- **DATA_MODEL.md** — Domain entities (Gym, User, Class, Booking, etc.) and relationships required to support user journeys
  - Enforces multi-tenant isolation, RBAC, and class lifecycle rules
  - Authority: Product requirements; derived from USER_JOURNEYS.md

- **MVP_SCREENS.md** — Consolidated screen list (32 MVP screens across all roles) with purposes, actions, and journey mappings
  - Defines the minimal UI surface needed for MVP execution
  - Authority: Design; derived from USER_JOURNEYS.md

- **DECISIONS.md** — Resolutions to blocking questions and ambiguities (e.g., waitlist auto-promotion, result logging window)
  - Overrides assumptions in earlier documents
  - Authority: Product; created when questions block design/implementation

### Tier 2: Working Documents (explore/)

These are exploratory artifacts used as inputs to consolidation and decision-making. They are intentionally exhaustive or speculative and may be superseded.

- **SCREENS_INVENTORY.md** — Exhaustive 50+ screen catalog (input to MVP screen consolidation)
  - Not authoritative; a working document for design exploration

### Tier 3: Agent Prompts (agents/)

These define specialized roles for collaborative design work using Claude as a co-designer.

- **MVP_SCREEN_CONSOLIDATION_AGENT.md** — Consolidates exhaustive screens into minimal MVP set
- **UX_SCREEN_MAPPING_AGENT.md** — Maps screens to user journeys and validates coverage
- **DATA_MODEL_AGENT.md** — Derives domain entities from journeys and scope

---

## How to Work with This Repository

### Reading & Understanding

1. **To understand the product:** Read PRODUCT.md (vision, scope, actors, features)
2. **To understand user workflows:** Read USER_JOURNEYS.md (core journeys for each role)
3. **To understand data requirements:** Read DATA_MODEL.md (entities and relationships)
4. **To see the UI plan:** Read MVP_SCREENS.md (screen inventory by role)
5. **To resolve ambiguities:** Check DECISIONS.md for resolved blocking questions

### Modifying Documentation

**When to update existing Tier 1 documents:**

- **PRODUCT.md:** Only when product scope or actor roles change (rare; high coordination cost)
- **USER_JOURNEYS.md:** When discovering missing steps or new roles in core flows
- **DATA_MODEL.md:** When journeys require new entities or relationship changes
- **MVP_SCREENS.md:** When user journeys change or a screen is discovered to be missing
- **DECISIONS.md:** When a blocking question is resolved or a decision needs revision

**When to add new documents:**

- Only add to Tier 1 if the artifact resolves a documented blocking question or clarifies an ambiguity in PRODUCT.md
- New working documents should go in explore/ with clear lifecycle (e.g., "This is input to [TIER 1 doc]")

### Workflow for Changes

1. **Identify the change:** Is this a product scope change, a journey discovery, a data model fix, or a decision?
2. **Start at the appropriate tier:** Changes cascade from Tier 1 down (e.g., product scope change → may require journey updates → may require data model updates → may require screen updates)
3. **Update downstream documents:** When you change a Tier 1 doc, check if downstream docs need updates
4. **Document the reason:** In commit message or a decision note, explain *why* the change was needed

### Multi-Agent Collaboration

The agents in agents/ are prompts for using Claude as a co-designer. Typical workflow:

1. **When consolidating screens:** Use MVP_SCREEN_CONSOLIDATION_AGENT with current PRODUCT.md, USER_JOURNEYS.md, and SCREENS_INVENTORY.md
2. **When mapping screens to journeys:** Use UX_SCREEN_MAPPING_AGENT to validate that screens cover all journey steps
3. **When deriving data model:** Use DATA_MODEL_AGENT with PRODUCT.md, USER_JOURNEYS.md, and MVP_SCREENS.md

To invoke an agent, extract its prompt from agents/ and paste it into Claude Code (or via API) with the specified input documents.

---

## Key Constraints & Rules

### Multi-Tenant Isolation

- Every entity except User is scoped to a single Gym
- Users can hold multiple roles across multiple gyms
- Query access control: `WHERE gym_id = :current_gym_id` on all domain queries
- No cross-gym visibility at any layer

### Class Lifecycle (MVP)

Classes follow a strict state machine: **Published → Booking Closed → In Progress → Completed → Archived**

- **Published:** Bookings allowed, structure editable, visible to eligible athletes
- **Booking Closed:** No new bookings (triggered at ~30min before class), structure still editable
- **In Progress:** Attendance marked, structure locked, no athlete interaction
- **Completed:** Results loggable (if class is loggable), view-only
- **Archived:** Read-only historical record

State transitions are automatic based on time or manual by gym owner/coach.

### Role-Based Access

- **Athlete:** Books classes, views own training history, logs results
- **Coach:** Assigns to classes, creates programming, marks attendance, views class results
- **Gym Owner:** Manages gym config, publishes schedules, manages staff and members
- **Platform Admin:** (Minimal MVP) Approves/suspends gyms, views platform health

Coaches do NOT manage payments, billing, or gym configuration.

### Visibility Rule (MVP)

Classes are only visible to an athlete if:
1. Athlete belongs to the gym (has active GymMembership), AND
2. Athlete's active membership plan grants access to the class type

Ineligible classes are not shown at all.

---

## MCP Configuration

This repository includes a **Model Context Protocol (MCP)** server for reading project documentation.

**File:** `docs.mcp.json`

**What it does:** Provides Claude Code with read-only access to the authoritative docs/ directory (PRODUCT.md, USER_JOURNEYS.md, DATA_MODEL.md, MVP_SCREENS.md, DECISIONS.md).

**How to use it:**

In Claude Code or your IDE, reference the MCP server to fetch project documents during design conversations. This ensures Claude always has the latest authoritative specs without manual copy-paste.

---

## Common Questions Resolved (See DECISIONS.md)

- **Class Recurrence:** MVP supports single-session classes only; no recurring series
- **Waitlist Promotion:** Automatic and immediate; no confirmation needed
- **Result Logging Window:** Athletes can edit results until the class is archived

---

## Glossary of MVP Terms

- **Class:** A scheduled training session athletes can book and attend
- **Class Type:** The nature of class (e.g., CrossFit, Gymnastics, Hyrox) that drives visibility and logging rules
- **Programming:** Optional content (WOD, strength work, instructions) associated with a class
- **Booking:** Athlete enrollment in a class (either confirmed or waitlisted)
- **Waitlist Promotion:** Automatic upgrade from waitlist to confirmed booking when capacity opens
- **Gym:** Multi-tenant root entity; independent fitness box or gym
- **Membership Plan:** Definition of which class types an athlete can access and at what price
- **GymMembership:** An athlete's enrollment in a gym (required for class visibility)
- **GymStaff:** Coach or owner assigned to manage a gym
- **Result:** Performance data logged by athlete for a completed class (e.g., time, reps, weight)

---

## Things NOT in MVP (Explicitly Deferred)

- Recurring series (recurrence: scheduled events only)
- National marketplace or gym discovery
- Social features (feeds, reviews, gamification)
- Advanced analytics dashboards
- Wearables integration
- Nutrition tracking
- Offline-first functionality

See PRODUCT.md section "Explicitly Out of Scope" for full list.

---

## Notes for Future Implementation Teams

- **Start with user journeys, not screens.** Every screen must map to a step in a user journey; screens without journeys are deferred
- **Data model is not SQL schema.** It defines entities and relationships; normalize and optimize schema separately
- **Class lifecycle is load-bearing.** Many features (visibility, editability, logging) depend on state transitions; don't simplify this away
- **Multi-tenant isolation is non-negotiable.** Every query must enforce gym_id scoping; test for cross-gym leaks early
- **Membership plan visibility is critical.** If an athlete doesn't belong to a gym or their plan doesn't include the class type, they must not see the class at all
