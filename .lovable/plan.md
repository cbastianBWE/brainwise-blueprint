

# Plan: Add Coach Certifications section to PlatformHealth.tsx

## Single file: `src/pages/super-admin/PlatformHealth.tsx`

### Change 1 — Add `Award` to lucide import (line 5)
Add `Award` to the existing icon imports.

### Change 2 — Add `certificationCounts` to Stats interface (line 13)
Add: `certificationCounts: Record<string, { in_progress: number; certified: number }>;`

### Change 3 — Add certification query to Promise.all (line 31)
Add `supabase.from("coach_certifications").select("certification_type, status")` and add `certRes` to destructuring.

### Change 4 — Process certification data (after line 40)
Build `certificationCounts` object by iterating `certRes.data`, counting `in_progress` and `certified` statuses per certification type.

### Change 5 — Add `certificationCounts` to setStats (line 46)
Include the new field in the stats object.

### Change 6 — Add Coach Certifications UI section (after line 112, the tier counts grid)
New section with heading "Coach Certifications", showing cards per certification type with in-progress and certified counts, using the `Award` icon.

No other files changed.

