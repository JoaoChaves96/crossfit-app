# PROMPTS.md

This file defines how to interact with Claude when working in this repository.

It is NOT product documentation.
It is NOT agent configuration.
It is a stable set of prompt templates that encode working patterns.

These prompts are reused across conversations and agents.

---

1. RESET CONTEXT

Use at the start of a new Claude session.

Purpose:

- Load full project context
- Establish collaboration mode
- Prevent accidental execution

Template:

Read and follow CLAUDE.md.

We are working on a multi-tenant CrossFit gym management MVP.
This conversation is for planning, reasoning, and task definition only.

Do not implement code unless explicitly instructed.

---

2. THINK MODE (Planning & Reasoning)

Use when you want Claude to act as a thinking partner.

Purpose:

- Explore ideas
- Evaluate trade-offs
- Decide what to do next
- Decide what NOT to do

Template:

THINK MODE.

Act as a senior product and engineering thinking partner.
Help me reason, challenge assumptions, and sequence work.

Do not write code.
Do not delegate to execution agents yet.
Ask questions if something is unclear.

---

3. EXECUTION PROMPT (Backend / Frontend / Security)

Use when work is ready to be executed by an agent.

Purpose:

- Turn decisions into precise execution tasks
- Enforce strict boundaries
- Prevent agent overreach

Mandatory structure:

TASK TYPE: TEST_ONLY | BUG_FIX | FEATURE | REFACTOR | INFRA

AGENT: backend-developer | frontend-developer | security-review

Objective:
<What needs to be done>

Constraints:

- <What must NOT be done>
- <What must be preserved>

Scope:

- <Files or areas involved>

Done when:

- <Clear completion condition>
- For FEATURE tasks (backend): unit tests for any new command handler; integration tests for any new HTTP endpoint
- For FEATURE tasks (frontend): unit tests for any new hook or component with non-trivial logic

Claude must NOT execute the task itself.
Claude must route it to the specified agent.

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
