
# Tier thumbnail RPC wiring (frontend only)

Backend already deployed: `public.get_thumbnail_urls_for_entities(p_entity_type text, p_entity_ids uuid[])` and the flat name/description/thumbnail_asset_id on `get_user_learning_state` assignment rows.

## 1. `src/lib/assetUrls.ts` — add helpers, keep `resolveThumbnailUrls`

Append two new exports. Existing `resolveThumbnailUrls` untouched.

```ts
export type TierEntityType = "cert_path" | "curriculum" | "module" | "resource";

interface TierThumbnailRow {
  entity_id: string; asset_id: string;
  bucket: string; path: string;
  dominant_color: string | null;
}

// Full meta (used by detail-page heroes that also want dominantColor)
export async function resolveTierThumbnailRows(
  entityType: TierEntityType, entityIds: string[]
): Promise<Map<string, ThumbnailMeta>> { ... }

// URL-only convenience (used by tile grids)
export async function resolveTierThumbnailUrls(
  entityType: TierEntityType, entityIds: string[]
): Promise<Map<string, string>> { ... }
```

Both call `supabase.rpc("get_thumbnail_urls_for_entities", { p_entity_type, p_entity_ids })`, then `supabase.storage.from(bucket).getPublicUrl(path)` per row. Errors log + return empty map.

## 2. `src/components/resources/MyLearningTab.tsx`

Replace the single `assetIds` collection + `resolveThumbnailUrls` query with three keyed queries (one per entity type), then derive a single `thumbnailMap: Map<thumbnail_asset_id, url>` that the existing `Section` component continues to read via `entity.thumbnail_asset_id`.

Implementation:
- Build three id arrays from `visibleSections`: `certPathIds` (`entity.cert_path_id`), `curriculumIds` (`entity.curriculum_id`), `moduleIds` (`entity.module_id`). Cover both Enrolled and Browse & Enroll — same call.
- Three `useQuery` hooks calling `resolveTierThumbnailUrls("cert_path"|"curriculum"|"module", ids)`. Keys: `["tier-thumb","cert_path",ids]` etc.
- Each returns `Map<entity_id, url>`. Re-index into `Map<thumbnail_asset_id, url>` by walking `visibleSections.*` and pairing `entity.thumbnail_asset_id → urlMap.get(entityId)`. Pass that combined map to `Section` so the existing `thumbnailMap?.get(entity.thumbnail_asset_id)?.url` access keeps working with zero changes inside `Section`.
- Now relies on the flat `entity.name`/`entity.description`/`entity.thumbnail_asset_id` from the updated RPC — no code change needed there since `Section` already reads those fields directly.

## 3. `src/components/resources/ResourceGridTab.tsx`

Swap `resolveThumbnailUrls(assetIds)` for `resolveTierThumbnailUrls("resource", resourceIds)`. Index the resulting map by `resource_id` instead of `thumbnail_asset_id`, and update the Tile prop to `thumbnailMap?.get(r.resource_id) ?? null` (drop the `r.thumbnail_asset_id` indirection).

## 4. `src/pages/learning/CertPathDetail.tsx`

- Hero: `useQuery` calling `resolveTierThumbnailRows("cert_path", [certPathId])` → `heroMeta = map.get(certPathId)`. Keeps `dominantColor` for the existing `heroBackgroundColor` split. Drop the `certPath.thumbnail_asset_id` indirection.
- Child curricula tiles: separate `useQuery` calling `resolveTierThumbnailUrls("curriculum", curriculumIds)` → tile reads `curriculaThumbMap?.get(c.curriculum_id) ?? null`.
- Remove `resolveThumbnailUrls` import.

## 5. `src/pages/learning/CurriculumDetail.tsx`

- Hero: `resolveTierThumbnailRows("curriculum", [curriculumId])`.
- Child module tiles: `resolveTierThumbnailUrls("module", moduleIds)` keyed by `m.module_id`.
- Remove `resolveThumbnailUrls` import.

## 6. `src/pages/learning/ModuleDetail.tsx`

- Hero: `resolveTierThumbnailRows("module", [moduleId])`.
- Content-item rows currently don't render thumbnails (the file's `assetIds` collects `ci.thumbnail_asset_id` but the list renders icons, not thumbnails) — but to be safe, keep `resolveThumbnailUrls` for `contentItems[*].thumbnail_asset_id` so any future thumbnail rendering on content items still works through the standard RLS chain. **Decision needed**: keep the existing content-item asset query untouched (uses `resolveThumbnailUrls`), or drop it entirely since nothing reads it. Default: keep it, minimal-touch.

## Verification (manual, after build)

Impersonate Caroline Perry (`afc2279f-2c13-4bc0-b712-2dbd4952528f`) as super admin:

1. Resources > My Learning > Enrolled → cert path tile shows title + description + thumbnail image.
2. Resources > My Learning > Browse & Enroll → cert path tile thumbnail renders.
3. Cert path detail → hero image + child curriculum tile thumbnails render.
4. Curriculum detail → hero image + child module tile thumbnails render.
5. Module detail → hero image renders.
6. All Resources tab → resource tile thumbnails render.

## Out of scope (per prompt)

- No changes to `resolveThumbnailUrls`, any RPC, `Tile.tsx`, or dominant-color tile rendering.

Ready to switch to build mode and ship.
