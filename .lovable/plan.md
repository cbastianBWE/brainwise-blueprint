# Plan — Couples runner: inner_team / ikigai hit the coaching backend

## Confirmed problem
`mr-core-1-4-who-i-am` (step `inner_team`) and `mr-core-7-2-what-we-are-for` (step `circles`, widget `ikigai`)
render the coaching widgets `InnerTeamWidget` / `IkigaiWidget`. Those widgets:

- call `supabase.rpc("coaching_session_save", { p_session_id: <relationship session id> })`
- invoke the edge functions `coaching-inner-team-map` / `coaching-ikigai-map` with that same id
- read back from `coaching_activity_sessions` by that id

Because the id belongs to `relationship_activity_sessions`, the save and the map action fail
(403 / "Access denied") and the map never appears for couples.

Note: the recording path is already correct — the registry now passes `sessionKind="relationship"`
to every reused widget that renders `MultimodalField`, and `recap` is not used by any couples activity.

## Proposed change
1. Backend: add relationship-aware handling.
   - Either extend `coaching-inner-team-map` / `coaching-ikigai-map` to accept
     `{ session_kind: "relationship", session_id }` and read/write `relationship_activity_sessions`
     with the couples access checks, or add two thin relationship counterparts.
   - These edge functions are not in this repo, so this step needs their source or a decision to
     create new ones under `supabase/functions/`.
2. Frontend: add an optional `sessionKind` prop to `InnerTeamWidget` and `IkigaiWidget` that switches
   the save RPC (`coaching_session_save` vs `relationship_session_save`), the function name, and the
   read-back table; pass `sessionKind="relationship"` from `widgetRegistry.tsx`.
3. Verify by running both couples activities end to end (map action returns a map, responses persist).
