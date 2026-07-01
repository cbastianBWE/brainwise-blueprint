## Add click-target annotations to Help Center screenshots

Overlay a highlight (bordered box + subtle glow, optionally a numbered badge) on each screenshot showing exactly where the user should click or type for that step.

### Approach

Two parts: (1) extend the guide data model so each step can declare one or more "hotspots" on its screenshot, and (2) render those hotspots as an overlay on top of the image in the Help page — not baked into the PNG. This keeps screenshots reusable, lets us re-capture without re-annotating, and stays crisp at any zoom.

### Data model change

In `src/content/help/types.ts`, add an optional `hotspots` array to `HelpStep`:

```ts
type Hotspot = {
  // percentages of the image's natural size, 0-100
  x: number; y: number; w: number; h: number;
  label?: string;       // optional short caption ("Click here")
  shape?: "rect" | "circle";
};
type HelpStep = { /* existing */ hotspots?: Hotspot[] };
```

Percent-based coords mean the overlay scales correctly on any screen.

### Renderer

New `src/components/help/AnnotatedScreenshot.tsx`:
- Wraps `<img>` in a `relative` container.
- For each hotspot renders an absolutely positioned box using `left/top/width/height` in `%`.
- Styling: 2px brand-primary border, soft primary-tinted glow (`box-shadow`), rounded corners, subtle pulse animation, and a numbered circular badge in the top-left of the box.
- Optional `label` renders as a small chip beneath the box.

`src/pages/Help.tsx` swaps its raw `<img>` for `<AnnotatedScreenshot>` when a step has hotspots (falls back to the plain image otherwise).

### Authoring the coordinates

For each existing Individual guide screenshot, I'll open the PNG, identify the click target (button, field, tab), and write the hotspot rect in percentages. Steps that are purely informational (no single click target) get no hotspot. I'll do this for the 5 Individual guides already captured, then apply the same pattern to every future role as we capture them.

### Scope of this change

- Additive only. No existing screenshot is re-captured or replaced.
- Only `src/content/help/types.ts`, `src/content/help/individual.ts` (adding `hotspots`), the new `AnnotatedScreenshot` component, and the render site in `src/pages/Help.tsx` change.
- Same pattern will be used for Coach, Coach Client, etc. as we capture them next.

### Optional niceties (say yes/no)

- Numbered badges on each hotspot (1, 2, 3) when a single step has multiple targets.
- Click-to-zoom on the whole screenshot (lightbox) so users can see the annotation at full size.
