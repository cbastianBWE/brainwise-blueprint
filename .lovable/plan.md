# Phase 10 Round 5 — ResourceGridTab + ResourceReader

Verified both files against the spec. All line anchors match. No issues to flag. Backend: NONE. Migrations: NONE. Types: NONE (resources subsystem already properly typed).

## Pre-flight verification results

- `src/components/resources/ResourceGridTab.tsx` (195 lines): handleFileDownload at 88-101, handleResourceClick at 103, search Input at 140-145 — all match spec.
- `src/pages/ResourceReader.tsx` (330 lines): useQuery destructure at 172, loading state at 196-202, VideoPlayer at 96-119, not-found branch at 204-217, not-accessible Back at 223, main Back near 313 — all match spec.
- `src/components/resources/types.ts` exports `Resource`, `ResourceTab`, `GetUserResourcesResult`, `UpgradeEntityType` — confirmed.
- `useResourceAccessLog` hook is fire-and-forget — confirmed.

## Edits

### A. `src/components/resources/ResourceGridTab.tsx`

**A1.** Add `aria-label="Search resources"` to the search `<Input>` (lines 140-145).

**A2.** Wrap `handleFileDownload` body in `try { ... } catch (err) { toast(...) }` (lines 88-101). Catch block fires the same "Could not download" toast with `err instanceof Error ? err.message : "An unexpected error occurred."`. Logical change is the wrapper + 1 catch block; ~14 lines of indentation churn expected in the diff.

**A3.** Insert the 6-line block comment documenting tile-click routing precedence above `handleResourceClick` (line 103). No body change.

### B. `src/pages/ResourceReader.tsx`

**B1.** Main loading state (lines 196-202): add `role="status"`, `aria-label="Loading resource"` to wrapper div, `aria-hidden="true"` on Loader2.

**B2.** `VideoPlayer` (lines 96-119):
- Add `refetch` to the `useResourceSignedUrl` destructure.
- Loading state gets `role="status"`, `aria-label="Loading video"`, `aria-hidden="true"` on Loader2.
- Error branch becomes a `<div className="space-y-3">` containing the existing `<p>` plus `<Button size="sm" onClick={() => refetch()}>Retry</Button>`.

**B3.** Resource-not-found branch (lines 204-217):
- Add `refetch` to the outer `useQuery` destructure on line 172.
- Back button gets the `navigate(-1)`-with-fallback handler.
- Card copy expanded to "Resource not found. If you expected to see this resource, it may have been moved or you may have lost access."
- Add `<Button size="sm" onClick={() => refetch()}>Retry</Button>` inside the card. CardContent gets `space-y-4`.

**B4.** Apply the `navigate(-1)`-with-fallback handler to the two remaining direct-navigate Back buttons:
- Line 223 (not-accessible branch)
- Line ~313 (main render)

Both replace `onClick={() => navigate("/resources")}` with the conditional `if (window.history.length > 1) navigate(-1); else navigate("/resources");`.

## Post-edit self-check

Run after edits, report results in completion message:

1. `rg "navigate\(\"/resources\"\)" src/pages/ResourceReader.tsx` → **3 matches** (all inside `else` fallback branches).
2. `rg "aria-label" src/components/resources/ResourceGridTab.tsx src/pages/ResourceReader.tsx` → **≥3 matches** (Search input + 2 loading states).
3. `rg "refetch" src/pages/ResourceReader.tsx` → **≥4 matches** (2 destructures + 2 onClick callsites).
4. `rg "try \{" src/components/resources/ResourceGridTab.tsx` → **1 match**.
5. Confirm no other files modified.

## Do-not-touch (within-file)

- `detectVideoEmbed`, `VideoEmbed`, `useResourceSignedUrl` signature, `FileDownloadCard`, DOMPurify config, content-type branching, `GROUP_ORDER` / `CONTENT_TYPE_GROUP_LABELS`, access-log `useEffect`.

## Do-not-touch (other files)

types.ts, UpgradeNudgeModal, useResourceAccessLog, safeUrl, Tile, tileVariants, MyLearningTab, CertPathDetail (R2 closed), CurriculumDetail + ModuleDetail (R3 closed), App.tsx, any edge function, any migration, any RPC.

## Scope

7 sections across 2 files. Single Lovable cycle. No backend, no migrations, no shared-file edits.
