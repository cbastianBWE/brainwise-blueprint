

# Plan: Add debrief gate to MyResults.tsx

## Single file: `src/pages/MyResults.tsx`

### 1. Add `debriefPendingIds` state (after line 134)
```typescript
const [debriefPendingIds, setDebriefPendingIds] = useState<Set<string>>(new Set());
```

### 2. Add debrief check in fetchResults (after line 231, before `setAssessments(filtered)` on line 233)
Insert the coach_clients query block that checks `results_released === false` for the user's assessments, building a `Set<string>` of pending assessment IDs. Only runs when `!isCoachView && effectiveUserId`.

### 3. Wrap sections inside `selected && (` block (lines 529–836)
- **Before** SECTION 1 (line 529), insert the debrief pending card and open `{!debriefPendingIds.has(selected.result.assessment_id) && (`
- **After** the ExportPdfModal (line 836), close with `)}`

This means when a result has `results_released = false`, only the pending-debrief card shows. When released, all existing sections render as before.

### No other changes
No imports needed (Card/CardContent already imported). No other files touched.

