## Group V — Prompt 2: Cert-path celebration marquee

Three coordinated, narrowly-scoped frontend changes. No backend, no new RPC.

### 1) `src/hooks/useCompletionReporter.ts` — plumb `entityId`

- Extend `CascadeResult` with `entityId: string | null`.
- In `mapRpcCascade`, also read `raw.entity_id` and return it (fallback `null`).
- Nothing else changes. Existing consumers reading `tier`/`entityName` are unaffected.

### 2) `src/pages/learning/ContentItemViewer.tsx` — replace the certification-tier stub

Leave the `module` and `curriculum` branches and the 4s auto-dismiss effect untouched.

Replace **only** the `cascadeModal?.tier === "certification"` branch (lines ~449–475) with the full marquee:

- Widen the dialog for this tier only — `<DialogContent className="sm:max-w-3xl">`. Module/curriculum keep default width.
- Keep the existing orange→plum gradient header with the `Award` icon.
- Add a `useQuery` keyed `["certification-credential", cascadeModal?.entityId]`, enabled only when `tier === "certification"` and `entityId` is truthy. Calls `supabase.rpc("get_certification_credential", { p_certification_id: cascadeModal.entityId })` — same call/key as the certification hub.
- States:
  - `entityId` null OR query error → fallback: "You're certified!" + single `Continue` button (no crash).
  - Loading → small centered `Loader2`.
  - Success → render the marquee body.
- Marquee body:
  - Heading "You're certified!" + line naming the cert via RPC `display_name`.
  - `<CertificateCanvas recipientName={recipient.full_name} certifiedAt={certification.certified_at} certificationType={certification.certification_type} onReady={...} />` — the same component the hub uses. Scaled to fit dialog width (CSS only; canvas keeps full export resolution).
  - Action row: `Download PNG`, `Download PDF`, `Share on LinkedIn`. PNG via `canvas.toBlob`, PDF via `jspdf`, LinkedIn via the Add-to-Profile URL (organizationId `118614203`, `startTask=CERTIFICATION_NAME`, `name=display_name`, `issueYear`/`issueMonth` parsed from `certified_at`). PNG/PDF disabled until `onReady` fires. Duplicating the few lines from the hub is acceptable; no shared-helper refactor needed.
  - Compact badge/banner downloads — the four static assets used by the hub (PTP coach LinkedIn navy/cream + email banner navy/cream). Small icon-row treatment, each fetches the asset and triggers a blob download.
  - Footer buttons:
    - Primary `View my certificate` — `setCascadeModal(null)` then `navigate("/coach/certification?cert=" + cascadeModal.entityId)`.
    - Secondary `Continue` — `setCascadeModal(null)`.
- Imports to add at top of the file: `useQuery` from `@tanstack/react-query`, `supabase`, `CertificateCanvas`, `jsPDF`, `Loader2`, `Download`, `FileText`, `Linkedin` icons.

Non-PTP cert types: `CertificateCanvas` renders nothing for unmapped templates — render a small "Certificate coming soon" note in place of the preview and hide PNG/PDF. Other actions still work.

### 3) `src/components/AppSidebar.tsx` — enable the Certification nav item

Single line edit at line 66. Remove `disabled: true` and `badge: "Coming Soon"` from the `/coach/certification` entry only. Every other `Coming Soon` nav item is untouched.

Result: `{ title: "Certification", url: "/coach/certification", icon: Award }`.

### Out of scope
- Module/curriculum cascade branches.
- Any backend/RPC change.
- LinkedIn OG link-share preview.

### Acceptance check after implementation
- Completing a cert-path final item fires the marquee with the personalized certificate, working downloads, LinkedIn share, and badge downloads.
- `View my certificate` lands on `/coach/certification?cert=<id>` and the hub opens that tab.
- Module + curriculum celebrations still work (regression).
- Sidebar "Certification" is clickable, no badge.
- Null/failed `entityId` → graceful fallback, no crash.