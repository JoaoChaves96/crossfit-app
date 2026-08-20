#!/bin/sh
# Automatic "save the RESUME memory" before the context window closes.
#
# Registered on THREE events, each doing a different job:
#   UserPromptSubmit — consume the sentinel when the human types
#   PostToolUse      — consume it during an autonomous stretch (see FAILURE 2)
#   PreCompact       — tripwire only; records that compaction happened anyway
#
# Why it is shaped this way: context_window data is delivered ONLY to the
# statusline, never to a hook, and no hook event carries a context-low signal.
# So ~/.claude/statusline-command.sh detects the threshold and drops a sentinel;
# this hook consumes it and injects an instruction into Claude's context.
#
# ── The two failures this shape exists to fix (measured 2026-08-20) ──────────
#
# FAILURE 1 — thresholds below the compact trigger. The first version fired at
# 15% and 7% remaining. Auto-compact reserves headroom, so it triggers while
# remaining is still well above 15: `-le 15` never became true and the sentinel
# was never written at all. Stages now sit at 40/25, ABOVE the trigger.
#
# FAILURE 2 — consumption was user-driven while the burn is agent-driven. The
# first version was UserPromptSubmit-only, so it could not fire inside a long
# autonomous stretch (test suites, big tool dumps) — which is exactly when
# context drains fastest. That is how a whole session ran to compaction with
# the sentinel unconsumed. PostToolUse is the fix and is the load-bearing one.
#
# Output format differs by event and is NOT interchangeable: UserPromptSubmit
# adds plain stdout to the conversation, PostToolUse does not and needs
# hookSpecificOutput.additionalContext. Emitting plain text on PostToolUse is
# silently useless — it reaches the user's transcript and never the model.
#
# `/clear` is NOT automated and cannot be: no hook output can invoke a slash
# command. This hook makes the save automatic and the clear a one-keystroke
# decision instead of something remembered.

input=$(cat)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
event=$(printf '%s' "$input" | jq -r '.hook_event_name // empty' 2>/dev/null)
[ -z "$session_id" ] && exit 0

lowctx_dir="${TMPDIR:-/tmp}/claude-lowctx"
mkdir -p "$lowctx_dir" 2>/dev/null
pending="${lowctx_dir}/${session_id}.pending"
log="${lowctx_dir}/events.log"
saved_marker="${lowctx_dir}/${session_id}.saved"

# Observability, because the original failure mode was SILENCE: the thing never
# fired and nothing anywhere recorded that it hadn't. Keep the tail bounded.
if [ -f "$log" ] && [ "$(wc -l < "$log" 2>/dev/null || echo 0)" -gt 400 ]; then
  tail -n 200 "$log" > "${log}.tmp" 2>/dev/null && mv "${log}.tmp" "$log" 2>/dev/null
fi
printf '%s\t%s\tsession=%s\tpending=%s\tsaved=%s\n' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "${event:-unknown}" "$session_id" \
  "$([ -f "$pending" ] && echo yes || echo no)" \
  "$([ -f "$saved_marker" ] && echo yes || echo no)" >> "$log" 2>/dev/null

# ── PreCompact: tripwire, never a blocker ───────────────────────────────────
# Blocking auto-compact risks a loop in an already-over-full context, so this
# only records the outcome. If this line ever shows saved=no, the threshold
# stages above are still wrong and need raising again.
if [ "$event" = "PreCompact" ]; then
  printf '%s\tPreCompact FIRED — compaction proceeding; save_had_run=%s\n' \
    "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
    "$([ -f "$saved_marker" ] && echo yes || echo NO-THRESHOLD-MISSED)" >> "$log" 2>/dev/null
  exit 0
fi

[ -f "$pending" ] || exit 0

ctx_left=$(cat "$pending" 2>/dev/null)
# Consume it: the statusline re-arms only on the next unfired stage (40 → 25),
# so removing this here is what keeps the reminder from repeating every turn.
rm -f "$pending"
touch "$saved_marker" 2>/dev/null

notice="CONTEXT IS LOW: ${ctx_left}% of the context window remains.

Standing instruction (memory: feedback_save_state_before_clear) — act on this now,
before continuing with the user's request:

1. Write or update the single \"RESUME HERE\" project memory, and its MEMORY.md index
   line. Capture what was just done, what is next, exact file/commit/card refs, and
   anything still uncommitted, unpushed, or unverified. Prefer updating the existing
   RESUME memory in place over creating a duplicate.
2. Do NOT commit, push, or open a PR to \"tidy up\" — that still needs the user's
   explicit go-ahead (memory: feedback_commit_only_on_command). If work is
   uncommitted, say so in the memory and in your reply.
3. Then tell the user, in one line, that state is saved and it is safe to run
   /clear. You cannot run it for them.

If you already saved the memory in this session and nothing has changed since, say
so in one line instead of rewriting it."

if [ "$event" = "PostToolUse" ]; then
  # additionalContext, exit 0 — MEASURED to work on this event, 2026-08-20, by a
  # real 40% threshold crossing in a live session (not a planted sentinel): the
  # turn received "PostToolUse:Bash hook additional context: CONTEXT IS LOW...".
  #
  # Plain stdout would NOT work here — on this event it "goes to the debug log
  # only, never the transcript, and Claude never sees it". That is a real trap:
  # the notice would look correct in a terminal and never reach the model.
  #
  # The documented alternative is exit 2, whose stderr Claude does see (it cannot
  # block anything, the tool has already run). It was tried, works, and was then
  # REMOVED: with additionalContext confirmed, exit 2 only duplicated the text and
  # surfaced it as a "blocking error", which reads like a fault rather than a
  # reminder. Keep it in mind as the fallback if additionalContext ever regresses.
  #
  # jq builds the JSON so quoting/newlines cannot break it — hand-rolled string
  # concatenation here is how this dies silently.
  jq -n --arg ctx "$notice" \
    '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
  exit 0
fi

# UserPromptSubmit: plain stdout IS added as context Claude can see and act on
# (documented, alongside UserPromptExpansion and SessionStart). Must not start
# with `{` or it would be parsed as JSON.
printf '%s\n' "$notice"
