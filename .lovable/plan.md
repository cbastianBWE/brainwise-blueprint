# Help Center at `/help` with role-aware, screenshot-backed guides

## What ships

- A new **Help Center** page at `/help`, added to the app sidebar for every signed-in user.
- Role-aware tabs across the top: **For you** (auto-selects the viewer's role) plus tabs for every role they're allowed to see. Regular users see only their own tab; admins, super admins, coaches, and mentors see all tabs.
- Each role tab contains **3–5 how-to guides**. Each guide is a stepped walkthrough: numbered steps, short prose, and inline screenshots of the real app (click to enlarge in a Dialog).
- A simple search box that filters guides across the visible tabs by title/keyword.
- Guides authored as structured data (TS objects), not free-form markdown, so screenshots and steps stay in sync and are easy to regenerate.

## Roles and top tasks per role

Draft task list — trim/swap before I capture:

- **Individual** — take an assessment, view your results, highlight & annotate a report, share results with a coach, manage notifications.
- **Coach Client** — accept a coach invite, take the assigned assessment, view what your coach can see, revoke sharing.
- **Coach** — invite a client, order/assign an assessment, review client results, share a report / team report, manage certification progress.
- **Mentor** — open a trainee, review their assessments & progress, leave written feedback, use a feedback template.
- **Org Member (corporate_employee)** — accept the org invite, complete the required assessment, view your results, notification preferences.
- **Org Admin / Company Admin** — invite members (single + bulk), pick the assessment for an invite, view the members table & completion status, share resources, revoke a member.
- **Super Admin** — invite an org, manage coach clients & tracking, run impersonation with justification, revoke trusted devices, toggle platform features.

## Screenshot capture

- Playwright, headless, against `localhost:8080`. Signs in per role using the credentials you paste, walks each flow, saves PNGs to `src/assets/help/<role>/<task>-<step>.png` and externalizes them via `lovable-assets` so the repo stays light.
- Credentials used once per session, never logged or echoed. Individual role: `cplummer19912003@gmail.com` (provided).
- Small dev script `scripts/capture-help-screenshots.ts` so we can rerun captures after UI changes instead of hand-updating images.

## Data & UI structure

- `src/content/help/types.ts` — `HelpGuide`, `HelpStep`, `HelpRole` types.
- `src/content/help/<role>.ts` — one file per role exporting an array of guides. Steps reference screenshot asset pointers.
- `src/pages/Help.tsx` — tabs (role gating via `useAccountRole`), search, guide list, and guide detail view.
- Route registered in `src/App.tsx` under `AppLayout`; sidebar entry added in `src/components/AppSidebar.tsx` (visible to all signed-in users; admin/coach/mentor roles see extra tabs).

## Delivery in phases

1. **Now:** Ship page, tabs, gating, search, and the full **Individual** role guides (5 tasks) with real screenshots captured from your test account. This proves the pattern.
2. **Next:** Coach Client guides (captured using a client account you paste when phase 1 lands).
3. **After:** Coach → Mentor → Org Member → Org/Company Admin → Super Admin, one role at a time as you paste each role's creds.

## What I need between phases

- Test-account credentials for the next role each time (email + password).
- Any edits to the task list for that role before I capture.

## Out of scope for this pass

- Video walkthroughs, in-product tooltip tours, or a marketing-site help center.
- Translations. English only.
- Automated screenshot drift detection in CI — the rerunnable script is the manual equivalent.
