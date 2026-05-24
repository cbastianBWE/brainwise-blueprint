import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SaveSnapshotDialogProps {
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function SaveSnapshotDialog({
  articleId,
  open,
  onOpenChange,
  onSaved,
}: SaveSnapshotDialogProps) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const nameValid = name.trim().length >= 1 && name.trim().length <= 80;
  const reasonValid = reason.trim().length >= 10;
  const canSave = nameValid && reasonValid && !saving;

  const reset = () => {
    setName("");
    setReason("");
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.rpc("commit_article_version", {
      p_article_id: articleId,
      p_version_name: name.trim(),
      p_reason: reason.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(`Failed to save snapshot: ${error.message}`);
      return;
    }
    toast.success(`Snapshot saved as "${name.trim()}"`);
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save snapshot of current draft</DialogTitle>
          <DialogDescription>
            Saves the current state as a named landmark in version history. You can restore to this point later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="snapshot-name">Snapshot name</Label>
            <Input
              id="snapshot-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              placeholder="e.g., Before rewriting intro"
              maxLength={80}
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Required, 1–80 characters</span>
              <span>{name.length}/80</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="snapshot-reason">Reason</Label>
            <Textarea
              id="snapshot-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this snapshot? (min 10 chars)"
              rows={2}
            />
            <div className="text-xs text-slate-400">
              {reason.trim().length < 10
                ? `${10 - reason.trim().length} more characters required`
                : "Looks good"}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
