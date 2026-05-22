import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BulkProgress from "./BulkProgress";
import useBulkChunkRunner from "./useBulkChunkRunner";
import type { BulkResult } from "./types";

interface BulkUnassignMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  traineeLabels: Map<string, string>;
  onComplete: () => void;
}

async function resolveMentorAssignments(
  mentorId: string,
  traineeIds: string[],
): Promise<{ assignmentIds: string[]; matchedTraineeIds: string[] }> {
  const { data, error } = await supabase
    .from("coach_mentor_assignments")
    .select("id, trainee_user_id")
    .eq("mentor_user_id", mentorId)
    .in("trainee_user_id", traineeIds)
    .is("ended_at", null);
  if (error) throw error;
  const rows = ((data as unknown) as { id: string; trainee_user_id: string }[]) ?? [];
  return {
    assignmentIds: rows.map((r) => r.id),
    matchedTraineeIds: rows.map((r) => r.trainee_user_id),
  };
}

export default function BulkUnassignMentorModal({
  open,
  onOpenChange,
  selectedUserIds,
  onComplete,
}: BulkUnassignMentorModalProps) {
  const queryClient = useQueryClient();
  const [mentorId, setMentorId] = useState("");
  const [endReason, setEndReason] = useState("");
  const [auditReason, setAuditReason] = useState("");
  const [resolvedAssignmentIds, setResolvedAssignmentIds] = useState<string[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const mentorsQuery = useQuery({
    queryKey: ["bulk-assign-mentors-list"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets" as any, {
        p_query: null,
        p_limit: 100,
        p_offset: 0,
        p_account_types: null,
        p_is_mentor: true,
        p_account_status_in: ["active"],
        p_has_active_assignments: null,
        p_organization_ids: null,
        p_certification_statuses: null,
        p_last_active_within: null,
        p_created_within: null,
        p_has_supervisor: null,
        p_sort_column: "name",
        p_sort_direction: "asc",
        p_specific_user_id: null,
      } as any);
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; full_name: string | null; email: string | null }>;
    },
  });

  // Preview match count when mentor selected
  useEffect(() => {
    if (!mentorId || selectedUserIds.length === 0) {
      setMatchedCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await resolveMentorAssignments(mentorId, selectedUserIds);
        if (cancelled) return;
        setMatchedCount(r.matchedTraineeIds.length);
      } catch {
        if (cancelled) return;
        setMatchedCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mentorId, selectedUserIds]);

  const runner = useBulkChunkRunner<{ endReason: string; auditReason: string }>({
    userIds: resolvedAssignmentIds,
    chunkSize: 50,
    runChunk: async (chunkAssignmentIds, args) => {
      const { data, error } = await supabase.rpc("unassign_mentor_bulk" as any, {
        p_assignment_ids: chunkAssignmentIds,
        p_end_reason: args.endReason,
        p_reason: args.auditReason,
      } as any);
      if (error) throw error;
      const r = (data ?? {}) as BulkResult;
      return {
        succeeded: r.succeeded ?? 0,
        failed: r.failed ?? 0,
        results: r.results ?? [],
      };
    },
    onComplete: ({ failed, succeeded }) => {
      queryClient.invalidateQueries({ queryKey: ["members-search"] });
      queryClient.invalidateQueries({ queryKey: ["list_mentor_trainees"] });
      if (failed === 0 && succeeded > 0) {
        setTimeout(() => onComplete(), 2000);
      }
    },
  });

  const canConfirm =
    !!mentorId &&
    endReason.trim().length >= 10 &&
    auditReason.trim().length >= 10 &&
    !runner.isRunning;

  const handleOpenChange = (next: boolean) => {
    if (runner.isRunning && !next) return;
    if (!next) {
      runner.reset();
      setMentorId("");
      setEndReason("");
      setAuditReason("");
      setResolvedAssignmentIds([]);
      setMatchedCount(0);
      setResolveError(null);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setResolveError(null);
    try {
      const { assignmentIds } = await resolveMentorAssignments(mentorId, selectedUserIds);
      if (assignmentIds.length === 0) {
        setResolveError("None of the selected users have this mentor.");
        return;
      }
      setResolvedAssignmentIds(assignmentIds);
      setTimeout(() => {
        runner.start({ endReason: endReason.trim(), auditReason: auditReason.trim() });
      }, 0);
    } catch (err) {
      toast({
        title: "Resolver failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const failedRows = runner.results.filter((r) => r.status !== "success" && r.status !== "ok");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk unassign mentor — {selectedUserIds.length} trainees</DialogTitle>
          <DialogDescription>End a mentor pairing for all selected trainees.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mentor</Label>
            <Select value={mentorId} onValueChange={setMentorId} disabled={runner.isRunning}>
              <SelectTrigger>
                <SelectValue placeholder="Select mentor…" />
              </SelectTrigger>
              <SelectContent>
                {(mentorsQuery.data ?? []).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name ?? m.email ?? m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mentorId && (
              <p className="text-xs text-muted-foreground">
                Will unassign {matchedCount} of {selectedUserIds.length} selected users who currently
                have this mentor.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>End reason (visible to trainee)</Label>
            <Textarea
              rows={3}
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              placeholder="At least 10 characters…"
              disabled={runner.isRunning}
            />
            <div className="text-xs text-muted-foreground">
              {endReason.trim().length}/10 minimum characters
            </div>
          </div>

          <div className="space-y-2">
            <Label>Audit reason (internal)</Label>
            <Textarea
              rows={3}
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              placeholder="At least 10 characters…"
              disabled={runner.isRunning}
            />
            <div className="text-xs text-muted-foreground">
              {auditReason.trim().length}/10 minimum characters
            </div>
          </div>

          {resolveError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
              {resolveError}
            </div>
          )}

          {(runner.isRunning || runner.processed > 0) && (
            <BulkProgress
              totalUsers={resolvedAssignmentIds.length}
              isRunning={runner.isRunning}
              processed={runner.processed}
              succeeded={runner.succeeded}
              failed={runner.failed}
              cancelled={runner.cancelled}
              onCancel={runner.cancel}
            />
          )}

          {failedRows.length > 0 && !runner.isRunning && (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-2 text-xs">
              <div className="mb-1 font-semibold text-amber-600">
                {failedRows.length} failure(s):
              </div>
              {failedRows.map((r, idx) => (
                <div key={idx} className="py-0.5">
                  <span className="font-mono">{(r.user_id ?? "").slice(0, 8)}</span> — {r.status}
                  {r.detail && (
                    <div className="pl-4 text-muted-foreground">{r.detail}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={runner.isRunning}>
            Close
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {runner.isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
