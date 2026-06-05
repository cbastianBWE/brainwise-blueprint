## Reverse-scored attention callout in AssessmentFlow

Single additive edit to `src/components/assessment/AssessmentFlow.tsx`.

### Changes

1. **Line 20** — add `AlertTriangle` to the lucide-react import:
   ```ts
   import { X, ChevronLeft, ChevronRight, Check, AlertTriangle } from "lucide-react";
   ```

2. **Inside line 423's `<div className="w-full max-w-2xl">`**, immediately before the `currentItem.scale_type === ...` ternary (line 424), insert the callout block exactly as specified:
   ```tsx
   {currentItem.reverse_scored && (
     <div className="mb-6 flex gap-3 rounded-lg border border-[#FFB703] bg-[#FFB703]/10 px-4 py-3">
       <AlertTriangle className="h-5 w-5 shrink-0 text-[#7a5800] mt-0.5" />
       <div className="text-sm text-[#7a5800]">
         <p className="font-semibold">Read this one carefully.</p>
         <p className="mt-0.5">
           The scale labels on this question may run in the opposite direction from the
           previous ones. Check both endpoint labels before you respond.
         </p>
       </div>
     </div>
   )}
   ```

No other behavior, scoring, saving, or navigation logic is touched.
