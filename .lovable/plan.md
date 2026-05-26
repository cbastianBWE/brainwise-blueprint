## Plan: Add pdfFonts.ts to src/lib/

1. Copy `user-uploads://pdfFonts.ts` → `src/lib/pdfFonts.ts` byte-identical (using code--copy, no edits, no reformatting).
2. Verify file exists and report size in bytes (`wc -c`).
3. Verify exports/imports by grepping the file for:
   - `import type jsPDF from "jspdf"` (line 24)
   - `export function registerPdfFonts` (or equivalent named export) with `jsPDF` param and `void` return
4. Run TypeScript check scoped to this file: `npx tsc --noEmit -p tsconfig.app.json` and filter output for `pdfFonts.ts`.
5. Report results of each step. If tsc reports errors in this file, stop and paste raw errors verbatim — no fixes.

No other files will be modified. No imports of this file will be added.