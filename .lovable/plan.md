

# Plan: Remove Coach Card from Onboarding

## Single file: `src/pages/Onboarding.tsx`

### Change 1 — Remove `GraduationCap` from import (line 8)
```tsx
import { Brain, User, Building2 } from "lucide-react";
```

### Change 2 — Update grid to `md:grid-cols-2` (line 99)
```tsx
<div className="grid gap-4 md:grid-cols-2">
```

### Change 3 — Remove coach Card block (lines 122–131)
Delete the entire third `<Card>` with GraduationCap/"I am a coach".

No other files changed.

