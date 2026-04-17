
# Plan: NAI rendering fixes + Coach/Client view toggle

Two files, no other changes.

## 1. Replace `src/components/results/NAINarrativeSections.tsx` in full

New version uses the full instrument item catalog (25 NAI items from `INST-002`) as the source of truth so the "all responses" count is always accurate, even when responses are missing. Key changes vs current implementation:

- Fetch all 25 items from `items` where `instrument_id = 'INST-002'`, then left-join responses by `item_id`. Missing responses render with `—` instead of a score.
- Outliers (`score >= 75`) computed only from items that have a response.
- Unified outlier section (Section 5) — same card for client and coach, with coach-only "Related PTP facets" line and AI interpretation. Cards are click-to-expand (only one open at a time).
- Pattern alert restyled to brand-approved Sand bg + Navy left border (replacing prior orange/red).
- Coach C.A.F.E.S.–PTP mapping cards expandable, showing primary/secondary PTP domains, facet refs, and AI coaching questions with fallback to `cafes_ptp_mapping.coaching_questions`.
- Cross-assessment section unchanged in behavior (renders when PTP exists).
- Collapsible "all responses" list shows `responses.length` (always 25 from catalog).
- `score_summary` permission level shows limited-access notice early-return.

## 2. Targeted edits to `src/pages/MyResults.tsx`

Four small edits, no refactor:

1. **New state**: `const [coachViewActive, setCoachViewActive] = useState(isCoachView);` added immediately before the `chatOpen` state.
2. **Sync effect**: new `useEffect(() => setCoachViewActive(isCoachView), [isCoachView])` placed right after the existing client-name fetch effect.
3. **Toggle UI**: a Tabs block ("Coach Report" / "Client Report") rendered immediately after the PTP Context Tabs block, gated by `isCoachView && isNAI`. Includes a small description line that changes per active tab.
4. **Prop swap**: change `isCoachView={isCoachView}` to `isCoachView={coachViewActive}` on the `<NAINarrativeSections />` element.

## Out of scope
PTP narrative component, PDF export, Edge Functions, Supabase schema/RLS, any other file.
