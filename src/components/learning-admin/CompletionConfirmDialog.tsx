import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export type MarkTier = "content_item" | "module" | "curriculum" | "cert_path";

export interface MarkTarget {
  tier: MarkTier;
  entityName: string;
  contentItemId?: string;
  moduleId?: string;
  assignmentId?: string;
  certificationId?: string;
  /** user_id for the three set_*_completion RPCs. Cert path uses certificationId alone. */
  userId: string;
  /** For cert path: true = grant, false = revoke. */
  complete: boolean;
}

interface Props {
  target: MarkTarget | null;
  onClose: () => void;
  invalidateKey: readonly unknown[];
}

const TIER_LABEL: Record<MarkTier, string> = {
  content_item: "content item",
  module: "module",
  curriculum: "curriculum",
  cert_path: "certification path",
};

function sideEffectLine(t: MarkTarget): string {
  if (t.tier === "cert_path") {
    return t.complete
      ? "This grants the certification and records an audit entry."
      : "This revokes the certification and records an audit entry.";
  }
  if (t.complete) {
    return "This marks the full subtree complete and will notify the learner of any completions.";
  }
  return "This recomputes parent progress. It will not change the learner's work on child items.";
}

function actionTitle(t: MarkTarget): string {
  if (t.tier === "cert_path") {
    return t.complete ? "Grant certification" : "Revoke certification";
  }
  return t.complete
    ? `Mark ${TIER_LABEL[t.tier]} complete`
    : `Mark ${TIER_LABEL[t.tier]} incomplete`;
}

function mapErrorMessage(raw: string): string {
  if (raw.startsWith("manual_incomplete_blocked_certified_cert_path")) {
    return "This learner is certified on a path that includes this item. Demote the certification first, then retry.";
  }
  if (raw.startsWith("reason_required_min_chars")) {
    return "Justification must be at least 10 characters.";
  }
  if (raw.startsWith("content_item_not_found_or_archived")) {
    return "This content item no longer exists or was archived.";
  }
  if (raw.startsWith("module_not_found_or_archived")) {
    return "This module no longer exists or was archived.";
  }
  if (raw.startsWith("curriculum_assignment_not_found")) {
    return "This curriculum assignment no longer exists.";
  }
  if (raw.startsWith("curriculum_assignment_unassigned")) {
    return "This curriculum has been unassigned from the learner.";
  }
  if (raw.startsWith("authentication_required")) return "Not permitted.";
  return raw;
}

export default function CompletionConfirmDialog({ target, onClose, invalidateKey }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) {
      setReason("");
      setSubmitting(false);
    }
  }, [target]);

  if (!target) return null;

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (reason.trim().length < 10) {
      toast({
        title: "Justification required",
        description: "Please enter at least 10 characters.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      let error: { message: string } | null = null;
      let data: any = null;
      if (target.tier === "content_item") {
        const res = await supabase.rpc("set_content_item_completion" as never, {
          p_user_id: target.userId,
          p_content_item_id: target.contentItemId,
          p_complete: target.complete,
          p_reason: reason,
        } as never);
        error = (res as any).error;
        data = (res as any).data;
      } else if (target.tier === "module") {
        const res = await supabase.rpc("set_module_completion" as never, {
          p_user_id: target.userId,
          p_module_id: target.moduleId,
          p_complete: target.complete,
          p_reason: reason,
        } as never);
        error = (res as any).error;
        data = (res as any).data;
      } else if (target.tier === "curriculum") {
        const res = await supabase.rpc("set_curriculum_completion" as never, {
          p_assignment_id: target.assignmentId,
          p_complete: target.complete,
          p_reason: reason,
        } as never);
        error = (res as any).error;
        data = (res as any).data;
      } else {
        const fn = target.complete ? "grant_certification" : "revoke_certification";
        const res = await supabase.rpc(fn, {
          p_certification_id: target.certificationId as string,
          p_reason: reason,
        });
        error = res.error as any;
      }
      if (error) throw error;

      const changed = data?.changed;
      if (changed === false) {
        toast({
          title: "No change",
          description:
            data?.note ??
            "This item was already in the requested state. No change was made.",
        });
      } else {
        toast({
          title: target.complete ? "Marked complete" : "Marked incomplete",
          description: target.entityName,
        });
      }
      qc.invalidateQueries({ queryKey: invalidateKey as unknown as any[] });
      onClose();
    } catch (err: any) {
      const raw = err?.message ?? String(err);
      toast({
        title: "Action failed",
        description: mapErrorMessage(raw),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{actionTitle(target)}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              <div>
                <span className="text-muted-foreground">Tier:</span>{" "}
                <span className="font-medium text-foreground">{TIER_LABEL[target.tier]}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Entity:</span>{" "}
                <span className="font-medium text-foreground">{target.entityName}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{sideEffectLine(target)}</p>
        <div className="space-y-2">
          <label className="text-sm font-medium">Justification (min 10 chars)</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this change being made?"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
