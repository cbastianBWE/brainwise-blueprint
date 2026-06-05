## Add hard completeness gate to AssessmentFlow submit

Single-file, additive change to `src/components/assessment/AssessmentFlow.tsx`. No changes to loading, saving, scoring, or navigation.

### Changes

1. **Derive `allAnswered`** immediately after the existing `const currentResponse = responses[currentItem?.item_id];` line:

   ```ts
   const allAnswered = items.length > 0 && items.every((it) => responses[it.item_id] != null);
   ```

   Uses `!= null` so a `0` answer counts as answered.

2. **Gate the Submit button** in the AlertDialog — change `disabled={submitting}` to `disabled={submitting || !allAnswered}`. Label text unchanged.

3. **Update the incomplete-case dialog description** to state the requirement:

   - From: `You have answered X of Y items. Unanswered items cannot be changed after submission.`
   - To:   `You have answered X of Y items. You must answer all Y items before you can submit.`

4. **Leave "Go to First Unanswered" intact** so users can jump to gaps.

No other behavior is touched.
