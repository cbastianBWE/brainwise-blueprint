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

type Tier = "curriculum" | "module" | "content_item";
type Direction = "complete" | "incomplete";

interface BulkOverrideCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  traineeLabels: Map<string, string>;
  onComplete: () => void;
}

export default function BulkOverrideCompletionModal({
  open,
  onOpenChange,
  selectedUserIds,
  onComplete,
}: BulkOverrideCompletionModalProps) {
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<Tier>("curriculum");
  const [targetId, setTargetId] = useState("");
  const [direction, setDirection] = useState<Direction>("complete");
  const [reason, setReason] = useState("");

  const curriculaQuery = useQuery({
    queryKey: ["curricula-list"],
    enabled: open && tier === "curriculum",
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
    enabled: open && tier === "module",
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

  const contentItemsQuery = useQuery({
    queryKey: ["content-items-list"],
    enabled: open && tier === "content_item",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("id, title")
        .is("archived_at", null)
        .order("title")
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string }>;
    },
  });

  const runner = useBulkChunkRunner<{
    tier: Tier;
    targetId: string;
    direction: Direction;
    reason: string;
  }>({
    userIds: selectedUserIds,
    chunkSize: 50,
    runChunk: async (chunkUserIds, args) => {
      const rpcName =
        args.tier === "curriculum"
          ? "set_curriculum_completion_bulk"
          : args.tier === "module"
            ? "set_module_completion_bulk"
            : "set_content_item_completion_bulk";
      const targetArg =
        args.tier === "curriculum"
          ? { p_curriculum_id: args.targetId }
          : args.tier === "module"
            ? { p_module_id: args.targetId }
            : { p_content_item_id: args.targetId };
      const { data, error } = await supabase.rpc(rpcName as any, {
        p_user_ids: chunkUserIds,
        ...targetArg,
        p_complete: args.direction === "complete",
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
      queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
      if (failed === 0 && succeeded > 0) {
        setTimeout(() => onComplete(), 2000);
      }
    },
  });

  const targetOptions: Array<{ id: string; label: string }> =
    tier === "curriculum"
      ? (curriculaQuery.data ?? []).map((o: any) => ({ id: o.id, label: o.name }))
      : tier === "module"
        ? (modulesQuery.data ?? []).map((o: any) => ({ id: o.id, label: o.name }))
        : (contentItemsQuery.data ?? []).map((o) => ({ id: o.id, label: o.title }));

  const canConfirm =
    !!targetId && reason.trim().length >= 10 && !runner.isRunning && selectedUserIds.length > 0;

  const handleOpenChange = (next: boolean) => {
    if (runner.isRunning && !next) return;
    if (!next) {
      runner.reset();
      setTargetId("");
      setReason("");
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    try {
      await runner.start({ tier, targetId, direction, reason: reason.trim() });
    } catch (err) {
      toast({
        title: "Bulk override failed",
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
          <DialogTitle>Bulk override completion — {selectedUserIds.length} users</DialogTitle>
          <DialogDescription>
            Mark a curriculum, module, or content item complete or incomplete for all selected users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tier</Label>
            <RadioGroup
              value={tier}
              onValueChange={(v) => {
                setTier(v as Tier);
                setTargetId("");
              }}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="curriculum" /> Curriculum
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="module" /> Module
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="content_item" /> Content item
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
                {targetOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <RadioGroup
              value={direction}
              onValueChange={(v) => setDirection(v as Direction)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="complete" /> Mark complete
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="incomplete" /> Mark incomplete
              </label>
            </RadioGroup>
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
