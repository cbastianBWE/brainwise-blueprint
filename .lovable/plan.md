## Diagnosis

I measured the template PNG and traced the drawing code. Both symptoms have clean, single-cause explanations.

### (a) Canvas drawing coordinate space
`<canvas width={3264} height={2522}>` and the effect calls `ctx.setTransform(1,0,0,1,0,0)` before drawing. No DPR scaling, no transforms applied. The CSS `maxWidth: 100%, height: auto` only scales the rendered DOM element — the internal bitmap stays 3264 × 2522. So `cw=3264`, `ch=2522` at draw time, and `cw*0.5` IS the canvas's geometric center.

### (b) Template image dimensions — mismatch, but not the cause
`TEMPLATES.ptp_coach` declares `3264 × 2522`. The actual file `public/certificates/ptp-coach-certificate-template.png` is **1920 × 1483**.

- Declared aspect ratio: 3264/2522 = 1.29421
- Actual aspect ratio:   1920/1483 = 1.29467

`drawImage(img, 0, 0, cw, ch)` therefore stretches the image ~1.7× uniformly. Because the aspect ratios match to 4 decimal places, fractional coordinates map proportionally — no horizontal or vertical drift is introduced. The declared dimensions are cosmetically wrong but **not** the bug source. (Worth fixing later for honesty, not required for this pass.)

### (c) "AWARDED ON" is off-center in the source PNG — ROOT CAUSE of symptom 2
I scanned bright-pixel column extents in the y-band where "AWARDED ON" sits (y=940–985 in image coords):

- "AWARDED ON" cluster: x = 692–903, center x = **797.5 / 1920 = 0.4154**

There is no paired cluster on the right at that Y; the label genuinely lives in the left third of the template. The geometric image center is 960 (fraction 0.5). The label is **~163px (8.5% of width) left of true center**.

The date is drawn at `cw * 0.5` → it lands ~163 stretched-pixels to the right of where it should be. No amount of vertical change fixes this — the X fraction must be moved to match the label.

### (d) "middle" baseline visual offset for Montserrat Bold
With `textBaseline="middle"`, the y coordinate is the typographic em-middle (≈ midpoint between font ascent and descent). For Montserrat Bold with mixed-case strings ("John Smith"), the visual optical center of the rendered glyphs sits within ~0.02–0.04 em of that point. At the current `nameSize = round(2522 * 0.046) ≈ 116px`, that's **~3–5 canvas pixels** — under 0.002 of canvas height. Negligible compared to the actual error below.

### (e) Vertical gap for the name — ROOT CAUSE of symptom 1
Scanning bright-pixel row densities in the template:

- "This certifies that" baked text: y = 354–374 (bottom = 374)
- "has successfully completed all requirements of the": y = 628–651 (top = 628)
- Gap midpoint: (374 + 628) / 2 = **501** → fraction **0.3378** of image height

Current code: `ch * 0.310` → name is drawn at y = 782 in canvas coords, i.e. y ≈ 460 in image coords. That places the name roughly 41 image-pixels above the gap midpoint — clearly closer to "This certifies that" than to the line below. Matches the reported symptom exactly.

Applying the negligible baseline-offset correction from (d) (subtract ~0.002 to nudge the geometric point slightly up so the optical center lands at 0.3378), the target NAME_Y fraction is **≈ 0.336**.

---

## Proposed fix

Single file: `src/components/certification/CertificateCanvas.tsx`. Two numeric values change. Nothing else.

1. Recipient name vertical position
   - Line 83: `ctx.fillText(recipientName, cw * 0.5, ch * 0.310);`
   - Change `0.310` → **`0.336`** (centered in the measured 374→628 gap, minus ~0.002 for optical-center vs em-middle)

2. Date horizontal position
   - Line 93: `ctx.fillText(dateText, cw * 0.5, ch * 0.689);`
   - Change `cw * 0.5` → **`cw * 0.415`** (matches the measured center of the baked "AWARDED ON" label at 797.5/1920)
   - Y value `0.689` stays — only the X changes

### What does NOT change
- Font logic, auto-shrink loop, `textAlign`, `textBaseline`, fill colors
- The `if (certifiedAt)` guard, date format string
- `TEMPLATES` declared dimensions (separate cosmetic issue; not fixing in this pass)
- Any other file

### Acceptance after fix
- Recipient name visually sits in the middle of the gap between "This certifies that" and "has successfully completed all requirements of the"
- Award date is horizontally centered under the baked "AWARDED ON" label
- Date stays on its current line (no vertical change)
- PNG/PDF exports match the on-screen preview

If you approve, I'll apply exactly those two value changes.