#!/bin/sh
# Hard stop before the context window closes: save the RESUME memory, tell the
# human, and yield the turn.
#
# Registered on three events:
#   PostToolUse      — owns the trigger. Runs at the cadence context actually
#                      burns, which is per tool call, not per human message.
#   UserPromptSubmit — same check, for the case where the human types first.
#   PreCompact       — tripwire AND self-calibration (see below).
#
# ── v3, 2026-08-21. Both previous versions failed; read why before touching. ──
#
# FAILURE 1 (v1, stages 15/7 of `remaining_percentage`) — never fired at all.
# FAILURE 2 (v2, stages 40/25 of `remaining_percentage`) — never fired either.
#   Session 317db35d compacted at 113297 input+cache tokens while the statusline
#   read "ctx 43% left". So the trigger sat THREE POINTS below the compaction
#   point and the log recorded `save_had_run=NO-THRESHOLD-MISSED`.
#
# Root cause common to both: `context_window.remaining_percentage` divides by the
# full 200000-token window, but auto-compaction divides by what remains after it
# reserves the output allowance. The two quantities differ by ~43 points while
# wearing the same label. **No threshold expressed in that percentage is safe**,
# which is why this version does not use it.
#
# What this version does instead: read the token count out of `transcript_path`
# — the same number auto-compaction acts on — and compare it against the point
# compaction actually fires, which is ~83% of the window (measured across 22
# compactions: every 200k session that compacted peaked at 164,000-168,300).
# The threshold is a percentage again, because the human asked for one, but of
# the CORRECT denominator: 25% means 25% of that 166,000, i.e. stop at ~124,500.
#
# FALSE LEAD, do not repeat: a first pass measured a single compaction at 113,297
# and hardcoded it as the budget. That was query error — it time-windowed the
# transcript and missed the peak, which was 142,561. Scanning ALL sessions is what
# produced the 83% figure. The lesson is the same one that sank v1: one
# measurement that confirms your expectation is not a measurement.
#
# FAILURE 3 (v2, separate and worse) — the notice said "act on this now, before
# continuing with the user's request", so even when it fired it told me to save
# the memory and then KEEP WORKING, burning the context the warning was about.
# A warning that stops nothing is narration. This version is a hard stop.
#
# `/clear` is NOT automated and cannot be: no hook output can invoke a slash
# command. This makes the save automatic and the clear one keystroke.

input=$(cat)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
event=$(printf '%s' "$input" | jq -r '.hook_event_name // empty' 2>/dev/null)
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
[ -z "$session_id" ] && exit 0

lowctx_dir="${TMPDIR:-/tmp}/claude-lowctx"
mkdir -p "$lowctx_dir" 2>/dev/null
log="${lowctx_dir}/events.log"
conf="${HOME}/.claude/lowctx.conf"

# Defaults, overridden by the conf file the human owns. Sourced rather than
# parsed so a typo is a loud shell error in the log, not a silent zero.
LOWCTX_STOP_PERCENT=25
LOWCTX_COMPACT_PERCENT=83
LOWCTX_WINDOW_DEFAULT=200000
[ -f "$conf" ] && . "$conf" 2>/dev/null

# The window is MODEL-DEPENDENT and hooks are not given it, so it is published by
# the statusline (which is) into <session>.window. Hardcoding 200000 here would
# silently mis-tune every 400k-window session — two in this project already.
window="$LOWCTX_WINDOW_DEFAULT"
window_src="default"
if [ -f "${lowctx_dir}/${session_id}.window" ]; then
  w=$(cat "${lowctx_dir}/${session_id}.window" 2>/dev/null)
  if [ -n "$w" ] && [ "$w" -gt 1000 ] 2>/dev/null; then
    window="$w"
    window_src="live"
  fi
fi

# The point auto-compaction actually fires, not the window size. 83% is measured
# across 22 compactions; see lowctx.conf for the data and the caveat that it is a
# ceiling rather than a guarantee.
budget=$(( window * LOWCTX_COMPACT_PERCENT / 100 ))

# ── Measure used context from the transcript ─────────────────────────────────
# The last `usage` record is the most recent assistant turn's context size.
# Sidechain entries are subagent turns against their OWN window, so counting
# them would report a number that has nothing to do with this session.
#
# `jq -R 'fromjson? // empty'` per line, so one truncated or partial line at the
# tail of a file being appended to cannot abort the whole computation — which a
# plain `jq -s` would do, silently reporting 0 and never firing.
used=0
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  used=$(tail -n 400 "$transcript" 2>/dev/null | jq -R -r '
    fromjson? // empty
    | select(.isSidechain != true)
    | .message.usage // empty
    | (.input_tokens // 0)
      + (.cache_read_input_tokens // 0)
      + (.cache_creation_input_tokens // 0)
  ' 2>/dev/null | tail -n 1)
  [ -z "$used" ] && used=0
fi

# Integer arithmetic only: `sh` has no floats, and `left*100/budget` in this order
# keeps the precision without them.
#
# `left` is allowed to go NEGATIVE and remaining_pct with it. Clamping it to zero
# was a real defect in the first cut of v3: a session already past the stop point
# reported "0% remains, ~0 tokens", which reads as a broken hook and wrongly
# escalated to the floor stage. Past the point is a distinct state and is
# reported as such.
remaining_pct=100
left=$budget
if [ "$budget" -gt 0 ] 2>/dev/null; then
  left=$(( budget - used ))
  remaining_pct=$(( left * 100 / budget ))
fi

# Observability, because the root failure of v1 and v2 was SILENCE — neither
# fired and nothing recorded that they hadn't. Every line now carries the numbers
# needed to diagnose a miss from one `tail`, with no transcript excavation.
if [ -f "$log" ] && [ "$(wc -l < "$log" 2>/dev/null || echo 0)" -gt 400 ]; then
  tail -n 200 "$log" > "${log}.tmp" 2>/dev/null && mv "${log}.tmp" "$log" 2>/dev/null
fi
fired_marker="${lowctx_dir}/${session_id}.fired"
floor_marker="${lowctx_dir}/${session_id}.floor"
printf '%s\t%s\tsession=%s\tused=%s\twindow=%s(%s)\tbudget=%s\tremaining=%s%%\tstop_at=%s%%\ttranscript=%s\tfired=%s\n' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "${event:-unknown}" "$session_id" \
  "$used" "$window" "$window_src" "$budget" "$remaining_pct" "$LOWCTX_STOP_PERCENT" \
  "$([ -n "$transcript" ] && [ -f "$transcript" ] && echo ok || echo MISSING)" \
  "$([ -f "$fired_marker" ] && echo yes || echo no)" >> "$log" 2>/dev/null

# ── PreCompact: tripwire, and the self-calibration ──────────────────────────
# Never a blocker — blocking auto-compact inside an already-over-full context
# risks a loop.
#
# If we get here the threshold was missed, so the budget was wrong. Rewrite it to
# what was actually observed. This is the one thing that makes the mechanism
# converge instead of needing a human to re-measure after every miss.
if [ "$event" = "PreCompact" ]; then
  printf '%s\tPreCompact FIRED — compaction proceeding; save_had_run=%s; observed_budget=%s\n' \
    "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
    "$([ -f "$fired_marker" ] && echo yes || echo NO-THRESHOLD-MISSED)" \
    "$used" >> "$log" 2>/dev/null

  # Recalibrate the FRACTION, not an absolute — the fraction is what transfers
  # across models. Only ever downward: compaction firing earlier than expected is
  # evidence the ceiling is lower, whereas a session that happens to compact late
  # tells us nothing about the earliest it could have.
  if [ ! -f "$fired_marker" ] && [ "$used" -gt 20000 ] 2>/dev/null && [ -f "$conf" ] \
     && [ "$window" -gt 1000 ] 2>/dev/null; then
    observed=$(( used * 100 / window ))
    if [ "$observed" -lt "$LOWCTX_COMPACT_PERCENT" ] && [ "$observed" -gt 40 ]; then
      sed "s/^LOWCTX_COMPACT_PERCENT=.*/LOWCTX_COMPACT_PERCENT=${observed}/" "$conf" \
        > "${conf}.tmp" 2>/dev/null && mv "${conf}.tmp" "$conf" 2>/dev/null
      printf '%s\tRECALIBRATED LOWCTX_COMPACT_PERCENT %s -> %s (used=%s window=%s)\n' \
        "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$LOWCTX_COMPACT_PERCENT" "$observed" \
        "$used" "$window" >> "$log" 2>/dev/null
    fi
  fi
  exit 0
fi

# ── Should we stop? ─────────────────────────────────────────────────────────
# Two stages. The configured one, and a floor at 6% so that continuing past the
# first stop cannot silently run all the way into compaction — the floor is the
# last chance, and it says so.
stage=""
if [ "$remaining_pct" -le 8 ] && [ ! -f "$floor_marker" ]; then
  stage="floor"
  touch "$floor_marker" 2>/dev/null
  touch "$fired_marker" 2>/dev/null
elif [ "$remaining_pct" -le "$LOWCTX_STOP_PERCENT" ] && [ ! -f "$fired_marker" ]; then
  stage="primary"
  touch "$fired_marker" 2>/dev/null
fi

[ -z "$stage" ] && exit 0

# Three distinct states, because conflating them is what made the first cut read
# like a malfunction. `left` may legitimately be negative.
if [ "$left" -lt 0 ]; then
  headline="ALREADY PAST the stop point by $(( 0 - left )) tokens — compaction may be imminent"
  urgency="You are past the threshold, not approaching it. Save and yield immediately."
elif [ "$stage" = "floor" ]; then
  headline="${remaining_pct}% of the usable context remains (~${left} tokens)"
  urgency="This is the FLOOR — the last stage before auto-compaction. Do not continue past it for any reason."
else
  headline="${remaining_pct}% of the usable context remains (~${left} tokens)"
  urgency="This is the configured stop (${LOWCTX_STOP_PERCENT}%)."
fi

tokens_left=$left
[ "$tokens_left" -lt 0 ] && tokens_left=0

printf '%s\tSTOP FIRED stage=%s remaining=%s%% left=%s used=%s budget=%s\n' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$stage" "$remaining_pct" "$left" "$used" "$budget" >> "$log" 2>/dev/null

notice="🛑 CONTEXT STOP — ${headline}. ${urgency}

STOP WORKING NOW. Do not start any new task, tool call, file read, test run, or
subagent. The current tool call has already completed; that is where this ends.

Standing instruction (memory: feedback_save_state_before_clear):

1. Update the single \"RESUME HERE\" project memory IN PLACE, plus its MEMORY.md index
   line. Capture what was just done, what is next, exact file/commit/card refs, and
   anything uncommitted, unpushed, or unverified. Do this CHEAPLY — edit in place, do
   not re-read files to refresh your memory of them. There are only ~${tokens_left}
   tokens left and a save that overruns them saves nothing.
2. Do NOT commit, push, or open a PR to \"tidy up\". That still needs the user's
   explicit go-ahead (memory: feedback_commit_only_on_command). If work is
   uncommitted, say so in the memory AND in your reply.
3. Then YIELD THE TURN: tell the user in two or three lines what state is saved, what
   is left to do, and that it is safe to run /clear. You cannot run /clear for them.
   Then stop and wait. Do not ask a question that invites you to keep working.

If you already saved the memory this session and nothing has changed since, say so in
one line and yield — do not rewrite it."

if [ "$event" = "PostToolUse" ]; then
  # additionalContext + exit 0. MEASURED to reach the model on this event
  # (2026-08-20, and again 2026-08-21 in a live session). Plain stdout does NOT
  # work here — it goes to the debug log only, which is a trap: the notice looks
  # correct in a terminal and never reaches the model. Exit 2's stderr also works
  # and was tried, then dropped: it duplicated the text and rendered as a
  # "blocking error", reading like a fault rather than a stop. Keep it in mind as
  # the fallback if additionalContext ever regresses.
  #
  # jq builds the JSON so newlines and quoting cannot break it. Hand-rolled string
  # concatenation here is how this dies silently.
  jq -n --arg ctx "$notice" \
    '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
  exit 0
fi

# UserPromptSubmit: plain stdout IS added to context. Must not begin with `{` or
# it parses as JSON — the emoji leading the notice also guarantees that.
printf '%s\n' "$notice"
