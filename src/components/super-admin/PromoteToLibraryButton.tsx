import { useState, KeyboardEvent } from "react";
import { Bookmark, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface PromoteToLibraryButtonProps {
  assetId: string;
  onPromoted?: () => void;
  disabled?: boolean;
}

export function PromoteToLibraryButton({ assetId, onPromoted, disabled }: PromoteToLibraryButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [libraryName, setLibraryName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setLibraryName("");
    setTagInput("");
    setTags([]);
  }

  function addTagFromInput() {
    const raw = tagInput.trim().toLowerCase();
    if (!raw) return;
    const parts = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    setTags((prev) => Array.from(new Set([...prev, ...parts])));
    setTagInput("");
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTagFromInput();
    }
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  async function handleSubmit() {
    if (!libraryName.trim()) return;
    setSubmitting(true);
    const finalTags = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)));
    const { error } = await supabase.rpc("promote_to_library", {
      p_asset_id: assetId,
      p_library_name: libraryName.trim(),
      p_library_tags: finalTags.length > 0 ? finalTags : null,
      p_reason: `Author promoted asset ${assetId} to the library via PromoteToLibraryButton`,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to promote", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Added to library", description: `Available as "${libraryName}" in the asset library.` });
    setOpen(false);
    reset();
    onPromoted?.();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="hover:text-[#006D77]"
      >
        <Bookmark className="h-4 w-4" /> Add to library
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add this asset to the library</DialogTitle>
            <DialogDescription>
              Library assets can be reused across multiple lessons. They support versioning — uploading a new version updates every place the asset is used.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lib-name">Library name</Label>
              <Input
                id="lib-name"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="e.g. PTP Module 1 Welcome Video"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-tags">Tags (optional)</Label>
              <Input
                id="lib-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={addTagFromInput}
                placeholder="Press Enter or comma to add"
                disabled={submitting}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        aria-label={`Remove ${t}`}
                        className="hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !libraryName.trim()}>Add to library</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PromoteToLibraryButton;
