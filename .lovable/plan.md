# Cycle B — WrittenSummary version history + ContentItemArtifactPanel bug fix

Two files, drop-and-break on the singular `written_submission` key. No Loader2 / palette / a11y changes (Cycle A). No other components touched.

## File 1: `src/components/mentor/WrittenSummaryReviewPanel.tsx`

### Add type + local helper (top of file, after imports, before `interface Props`)

```ts
type WrittenSubmission = {
  id: string;
  completion_id: string | null;
  iteration_number: number;
  content: string;
  char_count: number;
  submitted_at: string;
  review_decision: 'approved' | 'revision_requested' | null;
  reviewer_comments: string | null;
  reviewer_user_id: string | null;
  reviewed_at: string | null;
};

function formatDateTime(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}
```

Mirrors `LiveEventReviewPanel.tsx` / `SkillsPracticeReviewPanel.tsx`. No date-fns.

### Add import

```ts
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
```

### Replace line 37 (singular read)

```ts
const submissions: WrittenSubmission[] = Array.isArray(detailQuery.data?.written_submissions)
  ? detailQuery.data.written_submissions
  : [];
const latest: WrittenSubmission | null = submissions.length > 0
  ? submissions[submissions.length - 1]
  : null;
```

### `callReview` (lines 39-51): `submission?.id` → `latest?.id`. Guard copy unchanged.

### Replace render conditional (lines 108-183)

1. **`submissions.length === 0`** — preserve copy: "The trainee has not submitted this written summary yet." (`text-sm text-muted-foreground py-4`).

2. **`submissions.length >= 1`** — "Iteration history" heading, then iteration cards in ASC order (no reverse), then conditional mentor-actions card.

   **Iteration card (corrected Collapsible pattern — `className="group"` on Root, `group-data-[state=...]` on children):**

   ```tsx
   <div className="rounded-lg border bg-card p-4 space-y-3">
     <div className="flex items-center justify-between">
       <div className="flex items-center gap-2">
         <span className="font-medium text-sm">Iteration {iteration_number}</span>
         {review_decision && (
           <Badge variant="secondary" className="text-[10px] capitalize">
             {review_decision === 'approved' ? 'Approved' : 'Revision requested'}
           </Badge>
         )}
       </div>
       <span className="text-xs text-muted-foreground">{formatDateTime(submitted_at)}</span>
     </div>

     <Collapsible defaultOpen={isLatest} className="group">
       <div className="text-sm text-foreground/90 leading-relaxed group-data-[state=open]:hidden">
         {content.length > 120 ? content.slice(0, 120) + "…" : content}
       </div>
       <CollapsibleContent>
         <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
           {content}
         </div>
       </CollapsibleContent>
       <div className="flex items-center justify-between pt-2">
         <CollapsibleTrigger asChild>
           <Button variant="ghost" size="sm">
             <span className="group-data-[state=open]:hidden">Show full submission</span>
             <span className="group-data-[state=closed]:hidden">Hide</span>
           </Button>
         </CollapsibleTrigger>
         <span className="text-xs text-muted-foreground">{char_count} chars</span>
       </div>
     </Collapsible>

     {review_decision && (
       <div className="pt-2 border-t space-y-2">
         <div className="flex items-center gap-2">
           <span className="text-xs font-semibold text-muted-foreground">Review decision</span>
           <Badge variant="secondary" className="text-[10px] capitalize">{decision label}</Badge>
         </div>
         {reviewer_comments && (
           reviewer_comments.length > 200
             ? <Collapsible defaultOpen={false} className="group">
                 <div className="text-sm whitespace-pre-wrap group-data-[state=open]:hidden">
                   {reviewer_comments.slice(0, 80) + "…"}
                 </div>
                 <CollapsibleContent>
                   <div className="text-sm whitespace-pre-wrap">{reviewer_comments}</div>
                 </CollapsibleContent>
                 <CollapsibleTrigger asChild>
                   <Button variant="ghost" size="sm">
                     <span className="group-data-[state=open]:hidden">Show full comment</span>
                     <span className="group-data-[state=closed]:hidden">Hide</span>
                   </Button>
                 </CollapsibleTrigger>
               </Collapsible>
             : <p className="text-sm whitespace-pre-wrap">{reviewer_comments}</p>
         )}
       </div>
     )}
   </div>
   ```

   Pattern rationale: Radix sets `data-state="open|closed"` on the Collapsible Root. `className="group"` on Root creates a group context; children use `group-data-[state=...]:hidden` to read from Root. Bare `data-[state=...]` reads from the element itself, which would silently fail on the preview div. Mirrors `src/components/ui/navigation-menu.tsx` chevron rotation pattern.

   `isLatest` = `index === submissions.length - 1`.

3. **Mentor actions Card** — render ONLY when `latest !== null && latest.review_decision === null`. Existing block preserved verbatim. When `latest.review_decision !== null`, omit entirely.

### Untouched in File 1

- Loader2 spinners (Cycle A)
- Loading / error / no-contentItem branches
- `handleApprove`, `handleRequestRevision` bodies
- Toast copy
- Existing `data as any` cast
- All other imports

## File 2: `src/components/learning-admin/ContentItemArtifactPanel.tsx`

### Replace ONLY `WrittenSummaryArtifact` body (lines 67-89)

```tsx
function WrittenSummaryArtifact({ item, userId }: { item: any; userId: string }) {
  const q = useViewerDetail(item.content_item_id, userId, true);
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error) return <EmptyNote>Could not load submission.</EmptyNote>;

  const completion = q.data?.completion;
  const submissions: any[] = Array.isArray(q.data?.written_submissions)
    ? q.data.written_submissions
    : [];
  const latest = submissions.length > 0 ? submissions[submissions.length - 1] : null;

  if (!completion && submissions.length === 0) {
    return <EmptyNote>The learner has not started this item.</EmptyNote>;
  }

  return (
    <div className="space-y-2">
      <KV label="Review status" value={completion?.written_review_status ?? "—"} />
      <KV label="Iterations" value={String(submissions.length)} />
      {latest && (
        <>
          <KV label="Latest iteration" value={`#${latest.iteration_number}`} />
          <KV label="Char count" value={String(latest.char_count ?? "—")} />
          {latest.review_decision && (
            <KV label="Latest decision" value={String(latest.review_decision).replace(/_/g, " ")} />
          )}
          {latest.reviewer_comments && (
            <KV label="Reviewer comments" value={latest.reviewer_comments} />
          )}
          <div className="text-sm font-medium pt-2">Latest submission content</div>
          <div className="text-sm whitespace-pre-wrap rounded border p-3 bg-muted/30 max-h-60 overflow-y-auto">
            {latest.content ?? "(empty)"}
          </div>
        </>
      )}
      {!latest && <EmptyNote>No submissions yet.</EmptyNote>}
    </div>
  );
}
```

Removes: dead `completion?.written_submission_text` fallback; buggy `submission.length`; buggy `{submission ?? "(empty)"}` render.

### Untouched in File 2

- `useViewerDetail` (lines 51-65)
- Every other sub-component
- Dispatcher (lines 396-434)
- Imports

## QA gate (post-ship, in preview)

1. **Production smoke** — super-admin opens AdminLearningTree on trainee `dcc0afce-4c27-4127-afb5-3d81b0ab0a2f`, expands the written_summary item. Must show real content string; KV "Iterations" = "1"; KV "Latest iteration" = "#1".

2. **Revision-requested edge** — seed via `mentor_review_submission` with `p_decision='revision_requested'` and non-null non-empty `p_comments`. Audit row expected via `log_super_admin_action`. State CANNOT be reverted (`submission_already_reviewed` on second call) — seeded state persists; trainee can resubmit to create iteration #2 with `review_decision: null`. Verify:
   - Mentor portal `WrittenSummaryReviewPanel`: iteration #1 card with "Revision requested" badge, reviewer comments, submission content visible (collapsed preview or expanded). Mentor actions block does NOT render.
   - Super-admin AdminLearningTree `WrittenSummaryArtifact`: KV "Latest decision" = "revision requested", reviewer comments KV visible, submission content visible in scroll container.

## Files touched (exhaustive)

- `src/components/mentor/WrittenSummaryReviewPanel.tsx`
- `src/components/learning-admin/ContentItemArtifactPanel.tsx`

No backend. No other frontend. Only new import: `Collapsible` in File 1.
