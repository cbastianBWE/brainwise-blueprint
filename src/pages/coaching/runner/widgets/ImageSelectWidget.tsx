import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DictateButton } from "@/components/coaching/MultimodalField";
import { type Step, type SelectedImage, type LibraryImage, imgUrl } from "../shared";

export function ImageSelectWidget({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: SelectedImage[];
  onChange: (next: SelectedImage[]) => void;
}) {
  const [images, setImages] = useState<LibraryImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(step.pageSize ?? 12);
  const [dialogRow, setDialogRow] = useState<LibraryImage | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const softCap = step.softCap ?? 30;
  const selectMin = step.selectMin ?? 3;
  const pageSize = step.pageSize ?? 12;
  const maxLen = step.tagOnSelect?.maxLen ?? 40;
  const promptText = step.tagOnSelect?.prompt || "Add a short tag";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const category = step.source?.library;
      if (!category) {
        setError("No image library configured.");
        return;
      }
      const { data, error: err } = await supabase
        .from("coaching_media_library")
        .select("id, storage_path, alt")
        .eq("category", category)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError("Couldn't load images.");
        return;
      }
      setImages((data || []) as LibraryImage[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [step.source?.library]);

  const selectedByPath = useMemo(() => {
    const m = new Map<string, SelectedImage>();
    (value || []).forEach((s) => m.set(s.storage_path, s));
    return m;
  }, [value]);

  const openFor = (row: LibraryImage) => {
    const existing = selectedByPath.get(row.storage_path);
    setTagDraft(existing?.tag || "");
    setDialogRow(row);
  };

  const closeDialog = () => {
    setDialogRow(null);
    setTagDraft("");
  };

  const saveDialog = () => {
    if (!dialogRow) return;
    const trimmed = tagDraft.trim();
    if (!trimmed) return;
    const existing = selectedByPath.get(dialogRow.storage_path);
    let next: SelectedImage[];
    if (existing) {
      next = (value || []).map((s) =>
        s.storage_path === dialogRow.storage_path ? { ...s, tag: trimmed } : s,
      );
    } else {
      next = [
        ...(value || []),
        { library_id: dialogRow.id, storage_path: dialogRow.storage_path, tag: trimmed },
      ];
    }
    onChange(next);
    closeDialog();
  };

  const removeSelected = (path: string) => {
    onChange((value || []).filter((s) => s.storage_path !== path));
  };

  const removeFromDialog = () => {
    if (!dialogRow) return;
    removeSelected(dialogRow.storage_path);
    closeDialog();
  };

  const count = (value || []).length;
  const overCap = count > softCap;

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Selected</p>
          <p className="text-xs text-muted-foreground">
            {count} selected · cap {softCap}
          </p>
        </div>
        {count === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing selected yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {(value || []).map((s) => (
              <div key={s.storage_path} className="relative">
                <img
                  src={imgUrl(s.storage_path, 400, 400)}
                  alt={s.tag}
                  loading="lazy"
                  className="h-20 w-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeSelected(s.storage_path)}
                  aria-label={`Remove ${s.tag}`}
                  className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow-sm ring-1 ring-border"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="mt-1 max-w-[5rem] truncate text-xs text-muted-foreground">{s.tag}</p>
              </div>
            ))}
          </div>
        )}
        {overCap && step.overCapNudge && (
          <p className="mt-2 text-sm text-destructive">
            {step.overCapNudge.replace("{n}", String(count))}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!images && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
        </div>
      )}

      {images && images.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {images.slice(0, visible).map((row) => {
              const sel = selectedByPath.get(row.storage_path);
              const isSel = !!sel;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openFor(row)}
                  aria-label={`${row.alt || "Image"}${isSel ? " (selected)" : ""}`}
                  className={`relative overflow-hidden rounded-md border transition ${
                    isSel ? "ring-2 ring-primary" : "hover:opacity-90"
                  }`}
                >
                  <img
                    src={imgUrl(row.storage_path, 400, 400)}
                    alt={row.alt || ""}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {isSel && (
                    <>
                      <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                      {sel?.tag && (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-background/85 px-1.5 py-0.5 text-left text-xs">
                          {sel.tag}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {visible < images.length && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisible((v) => v + pageSize)}
              >
                Show more
              </Button>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Choose at least {selectMin}.
      </p>

      <Dialog open={!!dialogRow} onOpenChange={(o) => (!o ? closeDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedByPath.get(dialogRow?.storage_path || "") ? "Edit tag" : "Add a tag"}</DialogTitle>
          </DialogHeader>
          {dialogRow && (
            <div className="space-y-3">
              <img
                src={imgUrl(dialogRow.storage_path, 800, 800)}
                alt={dialogRow.alt || ""}
                loading="lazy"
                className="max-h-[50vh] w-full rounded-md object-contain"
              />
              <div className="space-y-1">
                <Label htmlFor="image-tag">Your tag</Label>
                <div className="flex gap-2">
                  <Input
                    id="image-tag"
                    autoFocus
                    value={tagDraft}
                    maxLength={maxLen}
                    placeholder={promptText}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveDialog();
                      }
                    }}
                  />
                  <DictateButton onFinal={(t) => setTagDraft((cur) => (cur ? cur + " " : "") + t)} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {dialogRow && selectedByPath.get(dialogRow.storage_path) && (
                <Button variant="outline" onClick={removeFromDialog}>
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={saveDialog} disabled={!tagDraft.trim()}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
