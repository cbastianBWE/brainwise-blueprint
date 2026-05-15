## Hotfix: Filter revoked invitations from CoachClients roster

**File:** `src/pages/coach/CoachClients.tsx` (only)

### Edit 1 — `uniqueClients` derivation (~line 218)
Add a single guard at the top of the `for (const row of enriched)` loop:
```ts
if (row.revoked_at !== null) continue;
```
This skips revoked rows so they don't contribute to the roster map or counts.

### Edit 2 — Level 2 assessment-detail filter (~line 620)
Update the TableBody filter from:
```tsx
.filter(c => c.client_email === selectedClientEmail)
```
to:
```tsx
.filter(c => c.client_email === selectedClientEmail && c.revoked_at === null)
```

### Out of scope
- SQL query (keeps fetching all rows, including revoked)
- Stat card calculations (already correct)
- `PendingInvitations` component
- Any other file

### Verification
Refresh `/coach/clients`: stat card and roster row count should match (both = 1), only `testclientbwe+coupontest@gmail.com` appears, Thomas is gone, "View Assessments" still shows the active PTP row, no TS errors.
