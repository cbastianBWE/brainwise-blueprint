

# Plan: Add results release toggle, debrief button, and related fields

## Changes (single file: `src/pages/coach/CoachClients.tsx`)

### 1. Import Switch (line 1 area)
Add `import { Switch } from "@/components/ui/switch";`

### 2. Add fields to ClientRow interface (after line 42)
Add `debrief_completed: boolean;` and `results_released: boolean;` to the interface.

### 3. Add resultsReleased state (after line 71)
```typescript
const [resultsReleased, setResultsReleased] = useState(false);
```

### 4. Update resetForm (line 179)
Add `setResultsReleased(false);` to resetForm.

### 5. Update fetchClients select query (line 79)
Add `debrief_completed, results_released` to the select string.

### 6. Update enriched.push (lines 135-147)
Add `debrief_completed: cc.debrief_completed,` and `results_released: cc.results_released,` to the pushed object.

### 7. Add Switch toggle to order modal (after line 535, before TabsContent)
Insert a toggle with label "Allow client to see results immediately" and helper text "If off, client must wait for coach debrief before viewing results", using the `resultsReleased` state.

### 8. Add results_released to coach-pays payload (line 212-221)
Add `results_released: resultsReleased` to the payload object.

### 9. Add results_released to client-pays insert (lines 272-278)
Add `results_released: resultsReleased` to the insert object.

### 10. Add debrief button in Level 2 Actions column (after line 746)
After the Remind button, add a conditional block: when `c.invitation_status === 'completed' && c.assessment_status === 'completed'`, render a Button that calls `supabase.from('coach_clients').update({ debrief_completed: true }).eq('id', c.id)` then refetches. Shows "Debrief Done" (disabled) if already done, otherwise "Mark Debrief Complete".

