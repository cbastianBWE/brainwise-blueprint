

# Plan: Add coachIdRef and use it in handlers in PrivacySettings.tsx

## Single file: `src/pages/PrivacySettings.tsx`

### 1. Add `useRef` to import (line 1)
Change `import { useEffect, useState, useCallback }` to `import { useEffect, useState, useCallback, useRef }`.

### 2. Add `coachIdRef` after `coachId` state (line 77)
Insert `const coachIdRef = useRef<string | null>(null);` after the existing `coachId` state declaration.

### 3. Update coach ID assignment in load (line 105)
Replace the single-line `setCoachId(cc[0].coach_user_id)` with a block that also sets `coachIdRef.current`.

### 4. Update `handleToggle` (lines 218–220)
After `const newEnabled = !current.enabled;`, add `const resolvedViewerUserId = key === 'coach' ? coachIdRef.current : viewerUserId;` and use `resolvedViewerUserId` in the `upsertPermission` call (line 220), in the `deletePermission` else-if path, and in the `share_results_with_coach` sync block.

### 5. Update `handleLevelChange` (lines 244–246)
Add `const resolvedViewerUserId = key === 'coach' ? coachIdRef.current : viewerUserId;` and use it in the `upsertPermission` call.

