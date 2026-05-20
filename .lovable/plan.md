## Hero hex color CSS fix

Bare hex colors are invalid in `background-image`, which voids the whole declaration and exposes the underlying navy page background. Fix by splitting the composed value into `backgroundImage` (gradient layers only) and `backgroundColor` (solid hex or `transparent`).

### Files (3)

- `src/pages/learning/CertPathDetail.tsx`
- `src/pages/learning/CurriculumDetail.tsx`
- `src/pages/learning/ModuleDetail.tsx`

### Change (identical in each)

Replace the `heroBackground` block with:

```ts
const heroOverlay = "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2))";
const heroFallback =
  "linear-gradient(135deg, var(--bw-navy) 0%, var(--bw-navy-700) 100%)";
// Bare hex colors are not valid in background-image; split solid into
// background-color and keep gradient(s) in background-image.
const heroBackgroundImage = heroMeta?.dominantColor
  ? heroOverlay
  : `${heroOverlay}, ${heroFallback}`;
const heroBackgroundColor = heroMeta?.dominantColor ?? "transparent";
```

Update the hero `<div>` style prop to:

```tsx
style={{ backgroundImage: heroBackgroundImage, backgroundColor: heroBackgroundColor }}
```

### Out of scope

Brain icon, embed select, resolver, call sites, backend — all untouched.
