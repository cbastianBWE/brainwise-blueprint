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
import { Input } from "@/components/ui/input";
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
import type { BulkAssignType, BulkResult } from "./types";

interface BulkAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  traineeLabels: Map<string, string>;
  onComplete: () => void;
  initialType?: BulkAssignType;
}

export default function BulkAssignModal({
  open,
  onOpenChange,
  selectedUserIds,
  onComplete,
  initialType,
}: BulkAssignModalProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<BulkAssignType>(initialType ?? "cert_path");
  const [targetId, setTargetId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Re-sync type when modal reopens with a different initialType.
  useEffect(() => {
    if (open && initialType) setType(initialType);
  }, [open, initialType]);

  const certPathsQuery = useQuery({
    queryKey: ["certification-paths-list"],
    enabled: open && type === "cert_path",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_paths")
        .select("id, name")
        .is("archived_at", null)
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const curriculaQuery = useQuery({
    queryKey: ["curricula-list"],
    enabled: open && type === "curriculum",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curricula")
        .select("id, name")
        .is("archived_at", null)
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
        .is("archived_at", null)
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const runner = useBulkChunkRunner<{
    type: BulkAssignType;
    targetId: string;
    dueAtIso: string | null;
    reason: string;
  }>({
    userIds: selectedUserIds,
    chunkSize: 50,
    runChunk: async (chunk, args) => {
      let rpcName: string;
      let payload: Record<string, unknown>;
      if (args.type === "cert_path") {
        rpcName = "enroll_users_in_certification_path_bulk";
        payload = {
          p_user_ids: chunk,
          p_certification_path_id: args.targetId,
          p_reason: args.reason,
          p_due_at: args.dueAtIso,
        };
      } else if (args.type === "curriculum") {
        rpcName = "assign_curriculum_bulk";
        payload = {
          p_user_ids: chunk,
          p_curriculum_id: args.targetId,
          p_source: "direct_assignment",
          p_certification_id: null,
          p_source_reference_id: null,
          p_due_at: args.dueAtIso,
          p_reason: args.reason,
        };
      } else {
        rpcName = "assign_module_bulk";
        payload = {
          p_user_ids: chunk,
          p_module_id: args.targetId,
          p_source: "direct_assignment",
          p_source_reference_id: null,
          p_due_at: args.dueAtIso,
          p_reason: args.reason,
        };
      }
      const { data, error } = await supabase.rpc(rpcName as any, payload as any);
      if (error) throw error;
      const r = (data ?? {}) as BulkResult;
      return {
        succeeded: r.succeeded ?? 0,
        failed: r.failed ?? 0,
        results: r.results ?? [],
      };
    },
    onComplete: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["members-search"] });
      queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
      if (failed === 0 && succeeded > 0) {
        setTimeout(() => onComplete(), 2000);
      }
    },
  });

  const targetOptions =
    type === "cert_path"
      ? certPathsQuery.data ?? []
      : type === "curriculum"
        ? curriculaQuery.data ?? []
        : modulesQuery.data ?? [];

  const canConfirm =
    !!type && !!targetId && reason.trim().length >= 10 && !runner.isRunning && selectedUserIds.length > 0;

  const handleOpenChange = (next: boolean) => {
    if (runner.isRunning && !next) return;
    if (!next) {
      runner.reset();
      setTargetId("");
      setDueDate("");
      setReason("");
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    try {
      await runner.start({
        type,
        targetId,
        dueAtIso: dueDate ? `${dueDate}T00:00:00Z` : null,
        reason: reason.trim(),
      });
    } catch (err) {
      toast({
        title: "Bulk assign failed",
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
          <DialogTitle>Bulk assign — {selectedUserIds.length} users</DialogTitle>
          <DialogDescription>
            Assign a certification path, curriculum, or module to all selected users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Assignment type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => {
                setType(v as BulkAssignType);
                setTargetId("");
              }}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="cert_path" /> Cert path
              </label>
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
            <Label>Due date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={runner.isRunning}
            />
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

          {(runner.isRunning || runner.processed > 0) && (
            <BulkProgress
              totalUsers={selectedUserIds.length}
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
