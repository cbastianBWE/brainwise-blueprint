
# Fix mentor picker source in LearningAdmin → AssignUnassignTab

Frontend-only edit to `src/pages/super-admin/LearningAdmin.tsx`. The dropdown currently calls `list_mentor_trainees` (a trainee roster) and treats trainees as mentor options. Repoint it to the existing `list_eligible_mentors()` RPC.

## Changes (single file: `src/pages/super-admin/LearningAdmin.tsx`)

### 1. Add an `EligibleMentor` type (near the existing `Trainee` type, ~line 147)

```ts
type EligibleMentor = {
  out_user_id: string;
  out_full_name: string | null;
  out_email: string | null;
  out_account_type: string | null;
};
```

### 2. Replace `mentorListQuery` (lines 742–750)

```ts
const mentorListQuery = useQuery({
  queryKey: ["list_eligible_mentors"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("list_eligible_mentors" as never, {} as never);
    if (error) throw error;
    return (data ?? []) as EligibleMentor[];
  },
  enabled: op === "assign" && type === "mentor",
});
```

### 3. Add a separate trainee lookup query so per-trainee labels still work

The old code re-used the mentor query's trainee rows to build `traineeById`. After repointing, that map would only contain mentors. Add a sibling query that mirrors `TraineeMultiSelect`'s cache key (so it dedupes):

```ts
const traineeListQuery = useQuery({
  queryKey: ["list_mentor_trainees"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("list_mentor_trainees" as never, {} as never);
    if (error) throw error;
    return data as { trainees: Trainee[] };
  },
  enabled: op === "assign" && type === "mentor",
});
```

### 4. Update the picker render block (lines 1251–1270)

```tsx
const opts = mentorListQuery.data ?? [];
const traineeById = new Map(
  (traineeListQuery.data?.trainees ?? []).map((t) => [t.trainee_user_id, t]),
);
return (
  <div className="space-y-3">
    <div className="space-y-2">
      <label className="text-sm font-medium">Mentor</label>
      <Select value={mentorId} onValueChange={setMentorId}>
        <SelectTrigger>
          <SelectValue
            placeholder={mentorListQuery.isLoading ? "Loading…" : "Choose a mentor"}
          />
        </SelectTrigger>
        <SelectContent>
          {opts.length === 0 && !mentorListQuery.isLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No users have the mentor role yet. Grant it in the Assign Mentor Role tab.
            </div>
          ) : (
            opts.map((o) => (
              <SelectItem key={o.out_user_id} value={o.out_user_id}>
                {o.out_full_name || o.out_email}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
    {/* per-trainee block below stays unchanged; traineeById now comes from the trainee query */}
```

Leave the per-trainee certification block (lines 1272+) as-is — it already reads from `traineeById`, which now correctly resolves trainees.

## Acceptance

1. Mentor dropdown lists only users with `is_mentor = true`.
2. Trainees no longer appear in the Mentor dropdown.
3. Selecting a mentor passes their real user id to `get_mentorable_certifications` and `assign_mentor_pairs_bulk`.
4. Per-trainee certification block still shows trainee names (from `list_mentor_trainees`).
5. Empty state copy renders when no mentors exist.
6. No other tabs or queries are affected.
