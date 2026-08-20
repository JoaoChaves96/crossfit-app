#!/bin/sh
# UserPromptSubmit hook — automatic "save the RESUME memory" at low context.
#
# Why it is shaped this way: context_window data is delivered ONLY to the
# statusline, never to a hook, and no hook event carries a context-low signal.
# So ~/.claude/statusline-command.sh detects the threshold and drops a sentinel;
# this hook consumes it and injects an instruction into Claude's context.
#
# UserPromptSubmit is the event whose plain stdout is added to the conversation,
# which is the point: the memory is then written by the main session, with the
# whole conversation in context. A PreCompact agent hook could only read the
# transcript second-hand, and that curation gap is exactly why claude-mem was
# declined on 2026-08-06.
#
# `/clear` is NOT automated and cannot be: no hook output can invoke a slash
# command. This hook's job is to make the save automatic and the clear a
# one-keystroke decision instead of something remembered.

input=$(cat)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
[ -z "$session_id" ] && exit 0

lowctx_dir="${TMPDIR:-/tmp}/claude-lowctx"
pending="${lowctx_dir}/${session_id}.pending"
[ -f "$pending" ] || exit 0

ctx_left=$(cat "$pending" 2>/dev/null)
# Consume it: the statusline re-arms only on the next unfired stage (15 → 7), so
# removing this here is what keeps the reminder from repeating every prompt.
rm -f "$pending"

cat <<EOF
CONTEXT IS LOW: ${ctx_left}% of the context window remains.

Standing instruction (memory: feedback_save_state_before_clear) — act on this now,
before continuing with the user's request:

1. Write or update the single "RESUME HERE" project memory, and its MEMORY.md index
   line. Capture what was just done, what is next, exact file/commit/card refs, and
   anything still uncommitted, unpushed, or unverified. Prefer updating the existing
   RESUME memory in place over creating a duplicate.
2. Do NOT commit, push, or open a PR to "tidy up" — that still needs the user's
   explicit go-ahead (memory: feedback_commit_only_on_command). If work is
   uncommitted, say so in the memory and in your reply.
3. Then tell the user, in one line, that state is saved and it is safe to run
   /clear. You cannot run it for them.

If you already saved the memory in this session and nothing has changed since, say
so in one line instead of rewriting it.
EOF
