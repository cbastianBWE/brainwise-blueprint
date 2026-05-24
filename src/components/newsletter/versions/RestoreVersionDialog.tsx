import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import type { VersionFull } from "./types";
import { VERSION_TYPE_BADGE } from "./versionBadgeStyles";

interface RestoreVersionDialogProps {
  version: VersionFull;
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}

export default function RestoreVersionDialog({
  version,
  articleId,
  open,
  onOpenChange,
  onRestored,
}: RestoreVersionDialogProps) {
  const [saveCheckpoint, setSaveCheckpoint] = useState(true);
  const [checkpointName, setCheckpointName] = useState("");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (open) {
      setSaveCheckpoint(true);
      setReason("");
      setCheckpointName(`Pre-restore checkpoint — ${format(new Date(), "MMM d, h:mm a")}`);
    }
  }, [open]);

  const reasonValid = reason.trim().length >= 10;
  const checkpointNameValid = !saveCheckpoint || (checkpointName.trim().length >= 1 && checkpointName.trim().length <= 80);
  const canRestore = reasonValid && checkpointNameValid && !working;

  const versionLabel = version.version_name || `v${version.version_number}`;

  const handleRestore = async () => {
    if (!canRestore) return;
    setWorking(true);

    if (saveCheckpoint) {
      const { error: ckptErr } = await supabase.rpc("commit_article_version", {
        p_article_id: articleId,
        p_version_name: checkpointName.trim(),
        p_reason: "Pre-restore checkpoint",
      });
      if (ckptErr) {
        setWorking(false);
        toast.error(`Failed to save checkpoint: ${ckptErr.message}. Restore aborted.`);
        return;
      }
    }

    const { error } = await supabase.rpc("restore_article_version", {
      p_version_id: version.version_id,
      p_reason: reason.trim(),
    });
    setWorking(false);
    if (error) {
      toast.error(`Restore failed: ${error.message}`);
      return;
    }
    toast.success(`Restored version "${versionLabel}"`);
    onOpenChange(false);
    onRestored();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore this version?</DialogTitle>
          <DialogDescription>
            Replaces the current draft with this version's body, title, excerpt, and settings.
            Your current draft will be lost unless you save it first.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm">{versionLabel}</span>
            <Badge variant="outline" className={VERSION_TYPE_BADGE[version.version_type]}>
              {version.version_type.replace("_", " ")}
            </Badge>
            <span className="text-xs text-slate-400">v{version.version_number}</span>
          </div>
          <div className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })} by{" "}
            {version.created_by_display_name ?? "Unknown"}
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id="save-checkpoint"
              checked={saveCheckpoint}
              onCheckedChange={(c) => setSaveCheckpoint(c === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="save-checkpoint" className="font-medium">
                Save current draft as a named revision first
              </Label>
              <p className="text-xs text-slate-500">
                Recommended. Lets you restore back to where you are now.
              </p>
            </div>
          </div>

          {saveCheckpoint && (
            <div className="space-y-1.5 pl-6">
              <Label htmlFor="ckpt-name" className="text-xs">Checkpoint name</Label>
              <Input
                id="ckpt-name"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value.slice(0, 80))}
                maxLength={80}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="restore-reason">Restore reason</Label>
            <Textarea
              id="restore-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why restoring? (min 10 chars)"
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            disabled={!canRestore}
            className="bg-[var(--bw-orange)] hover:bg-[var(--bw-orange-600)] text-white"
          >
            {working && <Loader2 className="h-4 w-4 animate-spin" />}
            Restore version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
