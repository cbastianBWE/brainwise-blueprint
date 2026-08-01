import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coupleImgUrl, type PickedImage } from "./CoupleImagePicker";
import type { CoupleStep } from "../coupleShared";

/**
 * Feeling-mode `image_select` (C20.8) — a body-image safeguard.
 *
 * Hard rule: this picker carries NO weight, calorie, exercise, measurement,
 * size or numeric content anywhere. No sliders, no scales, no body outlines,
 * no counts, no "N of M". Any library row whose alt text trips the guard below
 * is dropped rather than shown, and the guard is exported so it can be tested.
 */

const BANNED = [
  /\b\d/, // any digit at all
  /\b(kg|kgs|lb|lbs|stone|bmi|calorie|calories|kcal|cm|inch|inches|waist|weight|weigh|size|scale|measure|measurement|diet|exercise|workout|gym|fat|slim|thin|fitness|reps?)\b/i,
];

export function violatesFeelingGuard(text: string | null | undefined): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  return BANNED.some((re) => re.test(t));
}

interface LibraryRow {
  id: string;
  storage_path: string;
  alt: string | null;
}

export function FeelingImageSelectWidget({
  step,
  value,
  onChange,
  readOnly,
}: {
  step: CoupleStep;
  value: PickedImage[];
  onChange: (next: PickedImage[]) => void;
  readOnly?: boolean;
}) {
  const library = (step as any).source?.library as string | undefined;
  const [rows, setRows] = useState<LibraryRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!library) {
        setRows([]);
        return;
      }
      const { data, error: err } = await supabase
        .from("coaching_media_library")
        .select("id, storage_path, alt")
        .eq("category", library)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError(true);
        setRows([]);
        return;
      }
      setRows((data || []) as LibraryRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [library]);

  // The guard runs on the data, not on the copy: nothing numeric can reach the UI.
  const safeRows = useMemo(
    () => (rows || []).filter((r) => !violatesFeelingGuard(r.alt) && !violatesFeelingGuard(r.storage_path)),
    [rows],
  );

  const selectedPath = value?.[0]?.storage_path;

  const pick = (r: LibraryRow) => {
    if (readOnly) return;
    if (selectedPath === r.storage_path) {
      onChange([]);
      return;
    }
    onChange([{ library_id: r.id, storage_path: r.storage_path, alt: r.alt }]);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This is about feeling and being seen, never about your body's shape or size.
      </p>
      {step.intro && <p className="text-sm">{step.intro}</p>}

      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          One moment.
        </div>
      ) : error || safeRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">These images aren't ready yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {safeRows.map((r) => {
            const on = selectedPath === r.storage_path;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => pick(r)}
                aria-pressed={on}
                className={
                  "relative overflow-hidden rounded-lg border transition-opacity hover:opacity-90 " +
                  (on ? "ring-2 ring-primary" : "")
                }
              >
                <img
                  src={coupleImgUrl(r.storage_path, 480, 270)}
                  alt={r.alt || ""}
                  loading="lazy"
                  className="h-28 w-full object-cover"
                />
                {on && (
                  <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Choose the one that's closest to how you'd like closeness to feel.
      </p>
    </div>
  );
}
