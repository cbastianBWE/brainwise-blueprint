import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorSlidePane } from "./EditorSlidePane";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItemId: string;
  initialOutcomes: string[] | null | undefined;
}

export function LessonOutcomesPanel({
  open,
  onOpenChange,
  contentItemId,
  initialOutcomes,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [items, setItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(Array.isArray(initialOutcomes) ? [...initialOutcomes] : []);
    }
  }, [open, initialOutcomes]);

  const setAt = (i: number, v: string) =>
    setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  const removeAt = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const add = () => setItems((prev) => [...prev, ""]);
  const move = (i: number, dir: -1 | 1) =>
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    const cleaned = items.map((s) => s.trim()).filter((s) => s.length > 0);
    const { error } = await supabase
      .from("content_items")
      .update({ outcomes: cleaned.length > 0 ? cleaned : null })
      .eq("id", contentItemId);
    setSaving(false);
    if (error) {
      toast({
        title: "Could not save outcomes",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Outcomes saved" });
    await qc.invalidateQueries({ queryKey: ["lesson-blocks-editor-item", contentItemId] });
    await qc.invalidateQueries({ queryKey: ["content-item-outcomes", contentItemId] });
    onOpenChange(false);
  };

  return (
    <EditorSlidePane
      open={open}
      block={null as any}
      contentItemId={contentItemId}
      mode="edit"
      onChange={() => {}}
      onClose={() => onOpenChange(false)}
      isDirty={false}
      saving={false}
      onRequestSave={() => {}}
      siblingBlocks={[]}
      customContent={
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <div className="text-base font-semibold">Learning outcomes</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Short statements completing "By the end you'll be able to…". Shown on the
              lesson cover. Empty is allowed.
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-auto p-4">
            {items.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No outcomes yet. Add one to get started.
              </div>
            )}
            {items.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex flex-col text-muted-foreground hover:text-foreground"
                  aria-label="Reorder"
                >
                  <span
                    role="button"
                    onClick={() => move(i, -1)}
                    className="text-xs leading-none"
                  >
                    ▲
                  </span>
                  <GripVertical className="h-3 w-3" />
                  <span
                    role="button"
                    onClick={() => move(i, 1)}
                    className="text-xs leading-none"
                  >
                    ▼
                  </span>
                </button>
                <Input
                  value={value}
                  onChange={(e) => setAt(i, e.target.value)}
                  placeholder={`Outcome ${i + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeAt(i)}
                  aria-label="Remove outcome"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={add}>
              <Plus className="mr-1 h-4 w-4" /> Add outcome
            </Button>
          </div>
          <div className="flex justify-end gap-2 border-t p-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save outcomes"}
            </Button>
          </div>
        </div>
      }
    />
  );
}

export default LessonOutcomesPanel;
