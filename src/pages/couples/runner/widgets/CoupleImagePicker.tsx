import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export interface PickedImage {
  library_id: string;
  storage_path: string;
  alt?: string | null;
}

interface LibraryRow {
  id: string;
  storage_path: string;
  alt: string | null;
}

/** Same transform treatment the coaching surfaces use — never the original object. */
export const coupleImgUrl = (path: string, w: number, h: number) =>
  supabase.storage
    .from("coaching-media")
    .getPublicUrl(path, { transform: { width: w, height: h, resize: "cover" } }).data.publicUrl;

export function asPickedImages(val: unknown): PickedImage[] {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (x): x is PickedImage => !!x && typeof x === "object" && typeof (x as PickedImage).storage_path === "string",
  );
}

/** Read-only strip of picked images. */
export function PickedImageStrip({ picks, empty }: { picks: PickedImage[]; empty: string }) {
  if (picks.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {picks.map((p) => (
        <img
          key={p.storage_path}
          src={coupleImgUrl(p.storage_path, 480, 270)}
          alt={p.alt || ""}
          loading="lazy"
          className="h-24 w-40 rounded-md object-cover"
        />
      ))}
    </div>
  );
}

/**
 * Library-backed image picker. Mirrors the coaching ImageSelectWidget grid, but the
 * source lives on the question rather than the step, and no tag is collected.
 */
export function CoupleImagePicker({
  library,
  value,
  onChange,
  pageSize = 12,
  selectMin = 1,
}: {
  library?: string;
  value: PickedImage[];
  onChange: (next: PickedImage[]) => void;
  pageSize?: number;
  selectMin?: number;
}) {
  const [images, setImages] = useState<LibraryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(pageSize);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!library) {
        setError("No image library configured.");
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
        setError("Couldn't load images.");
        return;
      }
      setImages((data || []) as LibraryRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [library]);

  const selected = useMemo(() => new Set((value || []).map((p) => p.storage_path)), [value]);

  const toggle = (row: LibraryRow) => {
    if (selected.has(row.storage_path)) {
      onChange((value || []).filter((p) => p.storage_path !== row.storage_path));
    } else {
      onChange([...(value || []), { library_id: row.id, storage_path: row.storage_path, alt: row.alt }]);
    }
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!images && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
        </div>
      )}

      {images && images.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {images.slice(0, visible).map((row) => {
              const isSel = selected.has(row.storage_path);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => toggle(row)}
                  aria-label={`${row.alt || "Image"}${isSel ? " (selected)" : ""}`}
                  aria-pressed={isSel}
                  className={`relative overflow-hidden rounded-md border transition ${
                    isSel ? "ring-2 ring-primary" : "hover:opacity-90"
                  }`}
                >
                  <img
                    src={coupleImgUrl(row.storage_path, 480, 270)}
                    alt={row.alt || ""}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                  {isSel && (
                    <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {visible < images.length && (
            <div className="flex justify-center">
              <Button type="button" variant="outline" onClick={() => setVisible((n) => n + pageSize)}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        {selectMin > 1 ? `Choose at least ${selectMin}.` : "Choose one."}
      </p>
    </div>
  );
}
