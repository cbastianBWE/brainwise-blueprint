All four questions answered. Shipping as one PR with the locked decisions below.

### Decisions locked

- **Icon:** `/brain-icon.png` as-is (verified transparent, orange glyph).
- **Fallback when `dominantColor` is null:** the existing diagonal navy gradient, composed inside the same `backgroundImage` string as the darkening overlay.
- **Drop `bg-cover bg-center`** from all three hero `<div>`s (no-ops once no `url(...)` is in the background).
- **No loading skeleton** for color (backfill complete).
- Warm-icon-on-warm-bg risk accepted for v1.

### Files touched (5)

1. **`src/lib/assetUrls.ts`**
   - Export `ThumbnailMeta = { url: string; dominantColor: string | null }`.
   - Change return type to `Promise<Map<string, ThumbnailMeta>>`.
   - Extend embed select to `content_assets!...!inner(status, archived_at, dominant_color)`.
   - Defensive `Array.isArray(row.content_assets)` unwrap when reading `dominant_color`.

2. **`src/hooks/useAssetResolver.ts`** (line 21 area)
   - When building the `Record<string, string>`, extract `.url` from each entry so the hook's public shape stays a URL map.

3. **`src/pages/learning/CertPathDetail.tsx`**
   - Line 177 (hero): replace `heroThumbUrl`/`heroBackground` with the `heroMeta` + overlay-composed pattern below.
   - Line 413 (child Tile): `?.url ?? null`.
   - Hero `<div>`: drop `bg-cover bg-center`; add brain icon `<img src="/brain-icon.png" alt="" aria-hidden="true" className="absolute top-4 right-4 h-12 w-12 md:h-14 md:w-14 opacity-90" />` as first child, before the existing `absolute inset-0 ...` overlay container.

4. **`src/pages/learning/CurriculumDetail.tsx`**
   - Same hero rewrite (line 150 area).
   - Line 341 (child Tile): `?.url ?? null`.

5. **`src/pages/learning/ModuleDetail.tsx`**
   - Same hero rewrite (line 174 area).

6. **`src/components/resources/ResourceGridTab.tsx`** (line 163) — `?.url ?? null`.

7. **`src/components/resources/MyLearningTab.tsx`** (line 117) — `?.url ?? null`.

### Hero background snippet (used in all 3 detail pages)

```ts
const heroMeta = entity.thumbnail_asset_id
  ? thumbnailMap?.get(entity.thumbnail_asset_id) ?? null
  : null;
const overlay = "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2))";
const fallbackBg =
  "linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-navy-700) 100%)";
const heroBackground = heroMeta?.dominantColor
  ? `${overlay}, ${heroMeta.dominantColor}`
  : `${overlay}, ${fallbackBg}`;
```

### Out of scope

Tile components, editors, RPCs, edge functions, backend. Frontend-only.