# Group X: Unified Tile Primitive + Resources Page Shell

Establishes the shared visual primitive reused across Groups Y/Z/V/W and replaces the `/resources` placeholder with a data-driven three-tab shell fed by `get_user_resources`.

## Scope

In: tile primitive, thumbnail URL helper, access-log hook, Resources page shell, unblock coach sidebar entry, add `--bw-mustard` brand token.
Out: real tab content (Group Y), detail pages (Group Z), inline-CTA tile usage, click navigation wiring.

## Files

**Create**
- `src/components/tile/tileVariants.ts` — verbatim from spec, with `INSTRUMENT_BADGE_BG` values switched to `var(--bw-navy)` / `var(--bw-mustard)` / `var(--bw-forest)` / `var(--bw-slate)` for INST-001/002/003/004.
- `src/components/tile/Tile.tsx` — JSX pasted verbatim from the original prompt's fenced code block. All hex substitutions applied: `#FFB703`→`var(--bw-amber)`, `#2D6A4F`→`var(--bw-forest)`, `#3C096C`→`var(--bw-plum)`, `#F5741A`→`var(--bw-orange)` (both inline-style and Tailwind arbitrary `border-l-[var(--bw-orange)]` forms). `#FFFFFF` on instrument badges left as-is.
- `src/lib/thumbnailUrl.ts` — `buildThumbnailUrl(bucket, path)` via `supabase.storage.from(bucket).getPublicUrl(path)`, returns null on missing inputs.
- `src/hooks/useResourceAccessLog.ts` — `useCallback` fire-and-forget RPC `log_resource_access`, swallow errors via `console.warn`.

**Modify**
- `src/index.css` — add `--bw-mustard: #7a5800;` to `:root` adjacent to existing `--bw-*` tokens (right after `--bw-forest`). I'll first view the file to confirm the other `--bw-*` tokens exist as the user verified and to place the new token correctly.
- `src/pages/Resources.tsx` — full replacement: `useQuery(['get_user_resources'])` → loading/error/empty/`<Tabs>` shell sorted by `display_order`. Each `<TabsContent>` renders a "Coming soon" `<Card>` placeholder per the spec.
- `src/components/AppSidebar.tsx` — single-line edit on the `coachNav` Resources entry: drop `disabled: true, badge: "Coming Soon"`. No other changes.

## Technical notes

- Tile JSX is taken verbatim from the original prompt — including `onError` image hide, keyboard `Enter`/`Space` activation, `role="button"` only when interactive, `e.stopPropagation()` on inline CTA, `border-l-[3px]` current-location accent, `aspect-video` image wrapper.
- Sizing controlled by parent grid; tile owns only its internal 16:9 ratio.
- Resources RPC called with no args (server resolves caller); coach-only filtering is server-side.
- All TanStack Query / shadcn `<Tabs>` / `@/integrations/supabase/client` patterns match existing codebase usage.

## Acceptance

1. Coach sidebar Resources no longer disabled; `/coach/resources` reaches the new page.
2. `/resources` and `/coach/resources` render the three-tab shell (two tabs for non-coach roles per RPC).
3. Loading spinner / error card / empty state reachable.
4. Each tab body shows the "Coming soon" placeholder.
5. `Tile`, `buildThumbnailUrl`, `useResourceAccessLog` importable, strict-mode clean.
6. No regression to super-admin authoring flows.
7. `--bw-mustard` defined in `:root`; INST-002 badge resolves through it.
