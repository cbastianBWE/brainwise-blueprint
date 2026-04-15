

# Plan: Add "Go to First Unanswered" Button in Submit Dialog

## Single file: `src/components/assessment/AssessmentFlow.tsx`

### Change (lines 355–359)
Replace the `AlertDialogFooter` contents with three elements: Go Back cancel button, a conditional "Go to First Unanswered" button (shown only when incomplete), and the Submit action button.

```tsx
// Before (lines 356-359)
<AlertDialogCancel>Go Back</AlertDialogCancel>
<AlertDialogAction onClick={handleSubmit} disabled={submitting}>
  {submitting ? "Submitting..." : "Submit"}
</AlertDialogAction>

// After
<AlertDialogCancel>Go Back</AlertDialogCancel>
{Object.keys(responses).length < items.length && (
  <Button
    variant="outline"
    onClick={() => {
      setShowSubmitDialog(false);
      const firstUnanswered = items.findIndex((it) => !responses[it.item_id]);
      if (firstUnanswered >= 0) setCurrentIndex(firstUnanswered);
    }}
  >
    Go to First Unanswered
  </Button>
)}
<AlertDialogAction onClick={handleSubmit} disabled={submitting}>
  {submitting ? 'Submitting...' : 'Submit'}
</AlertDialogAction>
```

No other files changed.

