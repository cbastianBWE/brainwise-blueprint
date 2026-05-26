## Plan: PTP PDF cover — tighten sand-area spacing

Two single-line changes inside the cover block of `src/lib/generateResultsPdf.ts`.

| Element | Current | New |
|---|---|---|
| `NAVY_BLOCK_H` | `145` | `150` |
| `fieldY` | `NAVY_BLOCK_H + 25` | `NAVY_BLOCK_H + 14` |

All downstream coordinates (`fieldY + 9`, `fieldY + 13`, `versionY = fieldY + 28`, etc.) are relative and shift automatically. No other edits.

### Resulting layout (verified by math)

- Navy block: 0 → 150
- Pill: 138 → 147 (3 mm clearance to boundary)
- Sand block: 150 → 297
- Participant / Date fields: y = 164; underlines at 177
- Instrument Version: y = 192; underline at 205
- Disclaimer card: y = 220, ~40.5 mm tall, bottom ≈ 260.5
- Footer block: y = 275 → ~14.5 mm clearance above

### Verification

1. `npx tsc --noEmit -p tsconfig.app.json` — confirm clean.
2. Re-read cover block: only `NAVY_BLOCK_H` and `fieldY` changed.
3. No PDF export.
