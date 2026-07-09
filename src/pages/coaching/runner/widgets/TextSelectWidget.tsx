import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultimodalField, isMMRec, mmIsFilled, type MMValue } from "@/components/coaching/MultimodalField";
import { type Step, type SelectedSaying, type SayingRow } from "../shared";

export function TextSelectWidget({
  step,
  value,
  onChange,
  sessionId,
  activityCode,
}: {
  step: Step;
  value: SelectedSaying[];
  onChange: (next: SelectedSaying[]) => void;
  sessionId: string;
  activityCode: string;
}) {
  const [rows, setRows] = useState<SayingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogRow, setDialogRow] = useState<SayingRow | null>(null);
  const [reasonDraft, setReasonDraft] = useState<MMValue>("");
  const selectExactly = step.selectExactly ?? 3;
  const promptText = step.reflectOnSelect?.prompt || "Why does this resonate?";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const category = step.source?.library;
      if (!category) {
        setError("No saying library configured.");
        return;
      }
      const { data, error: err } = await supabase
        .from("coaching_saying_library")
        .select("id, text, author")
        .eq("category", category)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError("Couldn't load sayings.");
        return;
      }
      setRows((data || []) as SayingRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [step.source?.library]);

  const selectedById = useMemo(() => {
    const m = new Map<string, SelectedSaying>();
    (value || []).forEach((s) => m.set(s.saying_id, s));
    return m;
  }, [value]);

  const openFor = (row: SayingRow) => {
    const existing = selectedById.get(row.id);
    setReasonDraft(existing?.description ?? "");
    setDialogRow(row);
  };

  const closeDialog = () => {
    setDialogRow(null);
    setReasonDraft("");
  };

  const saveDialog = () => {
    if (!dialogRow) return;
    if (!mmIsFilled(reasonDraft)) return;
    const desc: MMValue = typeof reasonDraft === "string" ? reasonDraft.trim() : reasonDraft;
    const existing = selectedById.get(dialogRow.id);
    let next: SelectedSaying[];
    if (existing) {
      next = (value || []).map((s) =>
        s.saying_id === dialogRow.id ? { ...s, description: desc } : s,
      );
    } else {
      next = [
        ...(value || []),
        {
          saying_id: dialogRow.id,
          text: dialogRow.text,
          author: dialogRow.author,
          description: desc,
        },
      ];
    }
    onChange(next);
    closeDialog();
  };

  const removeSelected = (id: string) => {
    onChange((value || []).filter((s) => s.saying_id !== id));
  };

  const removeFromDialog = () => {
    if (!dialogRow) return;
    removeSelected(dialogRow.id);
    closeDialog();
  };

  const count = (value || []).length;
  const atCap = count >= selectExactly;

  return (
    <div className="space-y-4">
      {step.intro && <p className="text-sm text-muted-foreground">{step.intro}</p>}

      <p className="text-sm text-muted-foreground">
        {count} of {selectExactly} chosen
      </p>

      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-muted-foreground">Chosen</p>
        {count === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing chosen yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(value || []).map((s) => (
              <li key={s.saying_id} className="flex items-start gap-2 rounded-md border bg-muted/30 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{s.text}</p>
                  {typeof s.description === "string" && s.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.description}</p>
                  )}
                  {isMMRec(s.description) && (
                    <p className="mt-0.5 text-xs text-muted-foreground italic">Recorded answer</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSelected(s.saying_id)}
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sayings…
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => {
            const sel = selectedById.get(row.id);
            const isSel = !!sel;
            const disabled = !isSel && atCap;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => !disabled && openFor(row)}
                disabled={disabled}
                aria-label={`${row.text}${isSel ? " (selected)" : ""}`}
                className={`relative rounded-lg border p-3 text-left transition ${
                  isSel ? "ring-2 ring-primary" : "hover:bg-muted/40"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isSel && (
                  <span className="absolute right-2 top-2 rounded-full bg-primary p-0.5 text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <blockquote className="text-sm italic">{row.text}</blockquote>
                {row.author && (
                  <p className="mt-1 text-xs text-muted-foreground">— {row.author}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {atCap && (
        <p className="text-xs text-muted-foreground">Choose three. Remove one to swap.</p>
      )}

      <Dialog open={!!dialogRow} onOpenChange={(o) => (!o ? closeDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogRow && selectedById.get(dialogRow.id) ? "Edit your reason" : "Why this one?"}
            </DialogTitle>
          </DialogHeader>
          {dialogRow && (
            <div className="space-y-3">
              <blockquote className="rounded-md border bg-muted/30 p-3 text-sm italic">
                {dialogRow.text}
                {dialogRow.author && (
                  <span className="mt-1 block text-xs not-italic text-muted-foreground">
                    — {dialogRow.author}
                  </span>
                )}
              </blockquote>
              <div className="space-y-1">
                <Label>{promptText}</Label>
                <MultimodalField
                  value={reasonDraft}
                  onChange={setReasonDraft}
                  sessionId={sessionId}
                  activityCode={activityCode}
                  questionKey={`${step.key || "sayings"}:${dialogRow.id}:reason`}
                  placeholder={promptText}
                  minRows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {dialogRow && selectedById.get(dialogRow.id) && (
                <Button variant="outline" onClick={removeFromDialog}>
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={saveDialog} disabled={!mmIsFilled(reasonDraft)}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
