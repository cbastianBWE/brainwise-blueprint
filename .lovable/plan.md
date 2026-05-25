# H4 ImportHtmlModal client-side refactor

Single-file edit of `src/components/newsletter/editor/ImportHtmlModal.tsx`. Moves HTML→TipTap tree-walking from the deprecated `convert-html-to-tiptap` Edge Function into the browser via `generateJSON`; new `import-html-images` Edge Function (already deployed) is called only to fetch/upload images.

## Scope

- Edit only `src/components/newsletter/editor/ImportHtmlModal.tsx` (~150–180 LOC delta).
- No other files touched. No package additions. No SQL.
- `convert-html-to-tiptap` stays ACTIVE as fallback (untouched) for Session 101 soak.

## Changes inside the file

1. **Imports**: add `import { generateJSON } from "@tiptap/core";`. Keep all existing imports.

2. **Constants**: add `MAX_IMAGES_PER_IMPORT = 30` below `MAX_BYTES`.

3. **Types**:
   - Replace `ConversionFailure` kinds: drop `tag_dropped` and `image_limit_exceeded`; add `redirect_loop`, `phase_deadline_exceeded`; drop `tag_name`; keep `original_src?`.
   - Drop `tags_dropped` from `ConversionResponse.stats`.
   - Add new `ImportImagesResponse` interface for the new Edge Function shape.
   - Extend `ImportState.converting` with optional `subLabel?: string`.

4. **ERROR_MESSAGES**: add `too_many_images_client_preflight` and `doc_generation_failed`.

5. **New helper `rewriteImgsToSyntheticFigures(parsedDoc, resolutions)`** placed before the component. Walks every `<img>` and replaces it (or its enclosing `<figure>`) with a synthetic `<figure data-newsletter-image="true" data-width="inline">` carrying either `data-asset-id` (success) or `data-import-failed-src` (failure), preserving `alt` and any `<figcaption>` text. Skips images already inside a `figure[data-newsletter-image]` (round-trip). This is required because the newsletterImage `parseHTML` rule matches `figure[data-newsletter-image]` only.

6. **Rewrite `runConversion`** to the new pipeline:
   1. Size guard → `setState converting`.
   2. `DOMParser.parseFromString(html, "text/html")` with try/catch → `html_parse_failed` on error.
   3. Collect unique `<img>` srcs, split `data:` URIs from network URIs.
   4. Client-side preflight: if network URI count > 30 → error `too_many_images_client_preflight`.
   5. If network URIs > 0: POST `{image_urls, newsletter_article_id}` to `/functions/v1/import-html-images` with session bearer + apikey, AbortController wired into `abortRef`. Show `subLabel: "Fetching N image(s)…"`. Handle abort, network_error, non-OK body, invalid_response identically to current code.
   6. Merge data-URI srcs into resolutions as synthetic `scheme_rejected` failures.
   7. Call `rewriteImgsToSyntheticFigures(parsedDoc, resolutions)`.
   8. `generateJSON(parsedDoc.body.innerHTML, buildExtensions({editable: false}))` inside try/catch → `doc_generation_failed` on error.
   9. Build `ConversionResponse`: stats sum server stats + data-URI count (added to attempted + failed); failures list flattens every `resolutions[url].failure` with `original_src: url`.
   10. Preview text via existing `tipTapDocToPlainText` + `firstNWords(…, 200)`. Honor `closedDuringConvertRef`. `setState success`.

7. **SuccessView**:
   - Stat grid `sm:grid-cols-4` → `sm:grid-cols-3`; remove the "Tags dropped" `<StatCard>`.
   - Remove the `{f.tag_name && …}` line from the failure list (no longer in type).

8. **Converting phase render**: if straightforward, render `state.subLabel` as a small muted line below the existing "Converting HTML…" label. Optional polish; skip if it complicates the diff.

## What stays untouched

- `nodes/Image.ts`, all of `tiptap/`, `buildExtensions.ts`.
- `convert-html-to-tiptap` Edge Function.
- File reader, drag-and-drop, paste textarea, `PreviewRenderer`, `onImported` callback shape, hardcoded `SUPABASE_URL` / `SUPABASE_ANON_KEY`.
- `package.json` (fallback: only if `generateJSON` import fails type-check, add `@tiptap/html@^3.23.0` and re-import from there).

## Verification

- `npx tsc -b --noEmit` returns 0.
- Confirm `figure[data-newsletter-image]` parseHTML rule unchanged.
- Confirm no new dependency unless the documented fallback was required.
- Confirm `convert-html-to-tiptap/` directory untouched.
