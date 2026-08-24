# Get raters back into an unfinished 360

Frontend only, three files (one new). Uses the deployed `bw_360_my_rater_tasks` RPC and `bw_360_is_my_submission`; no invite token anywhere.

## 1. New page and route

New file `src/pages/three-sixty/ThreeSixtyAnswer.tsx`:
- Reads `submissionId` from route params.
- Confirms access with `bw_360_is_my_submission` before rendering; on failure, unknown id, or missing param, shows a plain "This feedback request is not available" card with a link back to the dashboard. No error text, no reason.
- On success renders `<AnswerFlow submissionId={submissionId} />` (unchanged component) with a short page heading.

Route registration in `src/App.tsx`, inside the signed-in block that already wraps `/dashboard` (`ProtectedRoute` + `AppLayout`, around line 267), not next to the public `/360/invite` at line 207:

```tsx
<Route path="/360/answer/:submissionId" element={<ThreeSixtyAnswer />} />
```

## 2. Dashboard card

`src/pages/Dashboard.tsx` — add a `bw_360_my_rater_tasks` call to the existing load, store `tasks`, and render a section directly above "Continue where you left off" (line ~297) only when `tasks.length > 0`. Nothing renders when the array is empty or the call fails; no empty state, no skeleton.

Per task:
- Title: `{subject_first_name} asked for your feedback` (first name only, matching the invitation email; the word "360" does not appear).
- Line: `{answered} of {total} answered. {days_left} days left.`
- Button: `Start` when `answered === 0`, otherwise `Continue`, navigating to `/360/answer/{submission_id}`.

## 3. End of onboarding

`src/pages/DemographicConsent.tsx` line 87 — `routeNext` checks for pending rater tasks first: exactly one task navigates to `/360/answer/{id}` with `replace: true`; zero, many, or any thrown error falls through to `/dashboard`. The whole check sits in a `try/catch` so a failure can never trap someone at the end of onboarding.

## useRoleRedirect

`src/hooks/useAuth.tsx` (`redirectByRole`, line 111) is the shared post-login redirect for every account type, and it runs before the account-type switch. Adding an unconditional RPC there would put a network call and a new branch in front of coach, admin and super-admin logins. Plan: add the check there too, but narrowly — after the `next` param short-circuit and only when the resolved `account_type` is `individual` / `corporate_employee` / missing, single-task only, wrapped in try/catch. If that ordering turns out to disturb any existing branch during implementation, it gets dropped and only change 3 ships, and the report says so.

## Verification

Typecheck plus a Playwright pass on `/dashboard` (zero-task case renders nothing) and on `/360/answer/<bogus-id>` (unavailable message, no error dump). Findings reported, nothing outside these files changed.
