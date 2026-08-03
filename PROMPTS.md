# PROMPTS.md

This file is a set of reusable prompt templates for delegating scoped work to
subagents. Claude implements much work directly (see CLAUDE.md); these templates
are for the cases where Claude — by its own judgment, or at the user's request —
hands a task to a `backend-developer` / `frontend-developer` / `security-review` /
`ux-designer` subagent.

It is NOT product documentation and NOT subagent configuration — just the shape of a
good delegation prompt.

---

1. PLANNING (Thinking Partner)

Use plan mode / the brainstorming skill when the goal is to reason, not yet act.

Purpose:

- Explore ideas, evaluate trade-offs
- Decide what to do next, and what NOT to do
- Sequence work before touching code

This is native plan mode now — no special prompt needed. Ask Claude to plan, or let
it plan on its own for anything non-trivial before implementing.

---

2. DELEGATION PROMPT (Backend / Frontend / Security / UX)

Use when Claude hands a scoped task to a subagent.

Purpose:

- Turn a decision into a precise task with clear boundaries
- Give the subagent the what/why/where/constraints and let it own the how

Recommended structure:

TASK TYPE: TEST_ONLY | BUG_FIX | FEATURE | REFACTOR | INFRA   (tag when it constrains scope)

Objective:
<What needs to be done, and why>

Constraints:

- <What must NOT be done>
- <What must be preserved>

Scope:

- <Files or areas involved — paths, not line numbers>

Done when:

- <Clear completion condition>
- For FEATURE tasks (backend): unit tests for any new command handler; integration tests for any new HTTP endpoint
- For FEATURE tasks (frontend): unit tests for any new hook or component with non-trivial logic

Claude reviews the returned diff, verifies, and commits — it owns the outcome.

---

4. TEST-ONLY GUARDRAIL

Use whenever adding or modifying tests.

Purpose:

- Prevent tests from reshaping production code

Mandatory add-on:

This is TEST_ONLY work.

Do NOT modify production code.
Do NOT add endpoints or features.
If required behavior does not exist, the test must fail and report why.

---

5. POST-INCREMENT REFLECTION (Optional)

Use at the end of a meaningful increment.

Purpose:

- Decide whether docs need updating
- Avoid over-documentation

Template:

We finished an increment.

Answer:

1. Did product scope change? (yes/no)
2. Were new rules or invariants introduced? (yes/no)
3. Was an ambiguity resolved? (yes/no)

Only if YES to any:

- Recommend which docs need updating and why.

---

Guiding rule:

If a prompt feels like it needs to be invented ad-hoc,
you are probably mixing THINK and EXECUTE modes.

Separate them.
``
