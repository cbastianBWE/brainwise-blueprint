
# Plan: Three UI tweaks in MyResults.tsx

## Change 1 — Hide "complete other half" banner for coaches (line 828)
Add `!isCoachView &&` at the start of the condition.

## Change 2 — Add context label to page heading (lines 771-773)
After the profile name text, append a muted span showing "— Professional", "— Personal", or "— Combined" when PTP tabs are active.

## Change 3 — Fix dropdown labels to show context type (lines 692-697)
For PTP assessments with a `context_type`, show "PTP Professional — MMM yyyy" instead of the generic instrument name.

No other files changed.
