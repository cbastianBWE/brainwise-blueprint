

# Plan: Auto-detect coach-invited clients in Onboarding.tsx

## Single file: `src/pages/Onboarding.tsx`

### Change 1 — Add `useEffect` to React import (line 1)
Change `import { useState } from "react"` to `import { useState, useEffect } from "react"`.

### Change 2 — Add useEffect after state declarations (after line 20)
Add a `useEffect` that checks `coach_clients` for the current user. If a matching row exists, automatically call `selectAccountType("individual")` to skip the onboarding choice and route directly to demographic consent.

No other files changed.

