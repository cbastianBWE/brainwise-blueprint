import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

type UnassignType = "curriculum" | "module";

interface BulkUnassignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  traineeLabels: Map<string, string>;
  onComplete: () => void;
}

async function resolveAssignmentIds(
  userIds: string[],
  type: UnassignType,
  targetId: string,
): Promise<{ assignmentIds: string[]; missingUsers: string[] }> {
  const table = type === "curriculum" ? "user_curriculum_assignments" : "user_module_assignments";
  const targetCol = type === "curriculum" ? "curriculum_id" : "module_id";
  const { data, error } = await supabase
    .from(table as any)
    .select("id, user_id")
    .in("user_id", userIds)
    .eq(targetCol, targetId)
    .eq("status", "active");
  if (error) throw error;
  const rows = ((data as unknown) as { id: string; user_id: string }[]) ?? [];
  const foundUserIds = new Set(rows.map((r) => r.user_id));
  return {
    assignmentIds: rows.map((r) => r.id),
    missingUsers: userIds.filter((id) => !foundUserIds.has(id)),
  };
}

export default function BulkUnassignModal({
  open,
  onOpenChange,
  selectedUserIds,
  onComplete,
}: BulkUnassignModalProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<UnassignType>("curriculum");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [resolvedAssignmentIds, setResolvedAssignmentIds] = useState<string[]>([]);
  const [missingUserIds, setMissingUserIds] = useState<string[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const curriculaQuery = useQuery({
    queryKey: ["curricula-list"],
    enabled: open && type === "curriculum",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curricula")
        .select("id, name")
        .eq("is_archived", false)
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const modulesQuery = useQuery({
    queryKey: ["modules-list"],
    enabled: open && type === "module",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, name")
        .eq("is_archived", false)
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Runner's `userIds` arg is misnomered here — we feed it resolved assignment_ids.
  const runner = useBulkChunkRunner<{ type: UnassignType; reason: string }>({
    userIds: resolvedAssignmentIds,
    chunkSize: 50,
    runChunk: async (chunkAssignmentIds, args) => {
      const rpcName =
        args.type === "curriculum" ? "unassign_curriculum_bulk" : "unassign_module_bulk";
      const { data, error } = await supabase.rpc(rpcName as any, {
        p_assignment_ids: chunkAssignmentIds,
        p_reason: args.reason,
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
      queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
      if (failed === 0 && succeeded > 0) {
        setTimeout(() => onComplete(), 2000);
      }
    },
  });

  const targetOptions = type === "curriculum" ? curriculaQuery.data ?? [] : modulesQuery.data ?? [];

  const canConfirm =
    !!targetId && reason.trim().length >= 10 && !runner.isRunning && selectedUserIds.length > 0;

  const handleOpenChange = (next: boolean) => {
    if (runner.isRunning && !next) return;
    if (!next) {
      runner.reset();
      setTargetId("");
      setReason("");
      setResolvedAssignmentIds([]);
      setMissingUserIds([]);
      setResolveError(null);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setResolveError(null);
    try {
      const { assignmentIds, missingUsers } = await resolveAssignmentIds(
        selectedUserIds,
        type,
        targetId,
      );
      setMissingUserIds(missingUsers);
      if (assignmentIds.length === 0) {
        setResolveError("None of the selected users are assigned to this target.");
        setResolvedAssignmentIds([]);
        return;
      }
      setResolvedAssignmentIds(assignmentIds);
      // Slight defer so runner sees the updated userIds via closure refresh.
      setTimeout(() => {
        runner.start({ type, reason: reason.trim() });
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
          <DialogTitle>Bulk unassign — {selectedUserIds.length} users</DialogTitle>
          <DialogDescription>
            Unassign a curriculum or module from all selected users. Users without an active
            assignment are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Assignment type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => {
                setType(v as UnassignType);
                setTargetId("");
                setResolvedAssignmentIds([]);
                setMissingUserIds([]);
              }}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="curriculum" /> Curriculum
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="module" /> Module
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Target</Label>
            <Select value={targetId} onValueChange={setTargetId} disabled={runner.isRunning}>
              <SelectTrigger>
                <SelectValue placeholder="Select target…" />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map((opt: { id: string; name: string }) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Justification reason</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="At least 10 characters…"
              disabled={runner.isRunning}
            />
            <div className="text-xs text-muted-foreground">
              {reason.trim().length}/10 minimum characters
            </div>
          </div>

          {missingUserIds.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              Note: {missingUserIds.length} user(s) have no active assignment for this target and
              will be skipped.
            </div>
          )}

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
