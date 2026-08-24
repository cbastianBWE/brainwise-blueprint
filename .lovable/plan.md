# Get raters back into an unfinished 360

Frontend only, three files (one new). Uses the deployed `bw_360_my_rater_tasks` RPC and `bw_360_is_my_submission`; no invite token anywhere.

## 1. New page and route

New file `src/pages/three-sixty/ThreeSixtyAnswer.tsx`:
- Reads `submissionId` from route params.
- Confirms access with `bw_360_is_my_submission` before rendering; on failure, unknown id, or missing param, shows a plain "This feedback request is not available" card with a link back to the dashboard. No error text, no reason.
- On success renders `<AnswerFlow submissionId={submissionId} />` (unchanged component) with a short page heading.
- Below `AnswerFlow`, on the page itself, a persistent "Back to dashboard" link. `AnswerFlow`'s thank-you card is terminal and has no navigation of its own, so a rater who finishes (or who has a second pending request) always has a way out without touching the component.

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

## useRoleRedirect: not touched

`src/hooks/useAuth.tsx` stays as it is. Change 3 covers the signup path and change 2 covers the returning rater, so the only thing a check there would add is auto-redirecting a returning rater away from their dashboard on every login — throwing someone who signed in for another reason into a colleague's feedback form. The cost is a network call and a new branch in the shared redirect path for every account type. Left out from the start.

## Verification

Typecheck, plus a Playwright pass covering:
- `/dashboard` with zero rater tasks: no card, no empty state, no stray heading.
- `/360/answer/<well-formed-but-unknown-uuid>`: RPC returns false; the "This feedback request is not available" card renders.
- `/360/answer/bogus-id`: the malformed id fails at parameter coercion (Postgres 22P02) before the function runs, so it surfaces as a thrown error rather than `false`. Both paths must land on the identical card, so the guard treats an error and a false result the same way.
- Console and network checked on each pass for unhandled errors.

Screenshots and findings reported. Nothing outside the three files changes.
