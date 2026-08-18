# Fix: practitioner's suggested PTP context never highlights

## What's happening

The suggestion is stored correctly. For the test client `testclientbwe+ptpsection@gmail.com`, the coach-client row has `preferred_first_context = 'both'` on the PTP instrument.

The context-selection page then looks up that row with the wrong instrument identifier: it filters on the short code `INST-001`, while the table stores the instrument's UUID (`02618e9a-...`). The lookup returns zero rows every time, so the page never learns there was a suggestion and no card gets highlighted — for any context choice, not just "both".

## The fix

One file: `src/pages/Assessment.tsx`, in the effect that loads the PTP context recommendation.

- Filter `coach_clients_client_view` by the PTP instrument UUID (resolved from the canonical instrument map in `src/lib/instruments.ts`) instead of the `INST-001` short code.
- Also scope the query to the signed-in user's `client_user_id`, matching how `InstrumentSelection.tsx` queries the same view, so multiple relationships resolve deterministically (newest first, already ordered).

No change is needed to the highlight UI itself — the banner, ring, and "Suggested by your practitioner" chip already handle `professional`, `personal`, and `both`; they were simply never given a value.

## Secondary (same behaviour, tile level)

On the assessment tile in `src/components/assessment/InstrumentSelection.tsx`, a suggestion of `both` currently produces no badge, because only `professional`/`personal` change the button. Add the "Your practitioner suggests starting here" badge for a `both` suggestion too, leaving the button unchanged, so the two screens tell the same story.

## Verification

Sign in as the test client and open the PTP context picker: the "Both" card should show the ring plus the suggested chip, with the banner above the three cards, and all three options still clickable.
