

# Plan: Redesign CoachClients with Two-Level Client → Assessment Drill-Down

## Summary
Replace the flat assessment table with a two-level view: Level 1 shows one row per unique client with aggregated counts; Level 2 (drill-down) shows that client's individual assessments with all existing columns and actions.

## Changes (single file: `src/pages/coach/CoachClients.tsx`)

### 1. Add `UniqueClient` interface (after `ClientRow`, ~line 42)
```typescript
interface UniqueClient {
  client_email: string;
  client_user_id: string | null;
  client_name: string | null;
  assessment_count: number;
  completed_count: number;
  pending_count: number;
}
```

### 2. Add state for unique clients and selected client
- `const [uniqueClients, setUniqueClients] = useState<UniqueClient[]>([]);`
- `const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);`

### 3. Update `fetchClients` (lines 62–141)
After building the `enriched` array (unchanged), derive `uniqueClients` by grouping on `client_email`:
- For each unique email, aggregate `assessment_count`, `completed_count` (where `assessment_status === "completed"`), and `pending_count` (where `invitation_status === "sent" || "opened"`).
- Take `client_name` and `client_user_id` from the first row with that email.
- Set both `setClients(enriched)` and `setUniqueClients(derived)`.

### 4. Fix `getStatusBadge` (line 349)
Already shows "Sent" — confirmed correct. No change needed here.

### 5. Replace the table rendering (lines 572–655)

**Level 1 — Client List** (when `selectedClientEmail` is null):
- Card with title "Client Roster", description showing client count
- Search input filtering by name/email
- Table columns: **Client** (name or email), **Email**, **Assessments** (total), **Completed**, **Pending**, **Actions**
- Actions column: single "View Assessments" button that sets `selectedClientEmail`

**Level 2 — Assessment Detail** (when `selectedClientEmail` is set):
- Back button: `← Back to Clients` clears `selectedClientEmail`
- Heading: client name/email
- "Order Assessment for This Client" button that opens the modal with `setEmail(selectedClientEmail)` pre-filled
- Existing assessment table filtered to `client_email === selectedClientEmail` with all current columns (Instrument, Status, Date Sent, Completed, Payment, Actions) and existing Results/Remind button logic — no changes to this table's content

### 6. Add `ArrowLeft` to lucide-react imports (line 19)
For the back button icon.

## What does NOT change
- The order modal, `handleOrderCoachPays`, `handleOrderClientPays`, `handleRemind`
- The stat cards
- The `ClientRow` interface and enrichment logic
- Any other files

