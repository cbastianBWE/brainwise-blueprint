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
import type { BulkResult, MentorableCert, MentorResolution } from "./types";

interface BulkAssignMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  traineeLabels: Map<string, string>;
  onComplete: () => void;
}

export default function BulkAssignMentorModal({
  open,
  onOpenChange,
  selectedUserIds,
  traineeLabels,
  onComplete,
}: BulkAssignMentorModalProps) {
  const queryClient = useQueryClient();
  const [mentorId, setMentorId] = useState<string>("");
  const [resolutions, setResolutions] = useState<Record<string, MentorResolution>>({});
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

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

  useEffect(() => {
    if (!mentorId || selectedUserIds.length === 0) {
      setResolutions({});
      return;
    }
    let cancelled = false;
    const initial: Record<string, MentorResolution> = {};
    for (const tid of selectedUserIds) {
      initial[tid] = {
        trainee_user_id: tid,
        trainee_label: traineeLabels.get(tid) ?? tid.slice(0, 8),
        loading: true,
        certifications: [],
        selectedCertId: null,
        error: null,
      };
    }
    setResolutions(initial);
    Promise.all(
      selectedUserIds.map(async (tid) => {
        try {
          const { data, error } = await supabase.rpc("get_mentorable_certifications" as any, {
            p_mentor_user_id: mentorId,
            p_trainee_user_id: tid,
          } as any);
          if (error) throw error;
          const certs = ((data as { certifications?: MentorableCert[] })?.certifications ?? []);
          if (cancelled) return;
          setResolutions((prev) => ({
            ...prev,
            [tid]: {
              ...prev[tid],
              loading: false,
              certifications: certs,
              selectedCertId: certs.length === 1 ? certs[0].certification_id : null,
            },
          }));
        } catch (err) {
          if (cancelled) return;
          setResolutions((prev) => ({
            ...prev,
            [tid]: { ...prev[tid], loading: false, error: (err as Error).message },
          }));
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [mentorId, selectedUserIds, traineeLabels]);

  const resolvedList = Object.values(resolutions);
  const skipped = resolvedList.filter((r) => !r.loading && !r.error && r.certifications.length === 0).length;
  const willAssign = resolvedList.filter((r) => r.selectedCertId !== null).length;
  const pendingChoice = resolvedList.filter(
    (r) => !r.loading && !r.error && r.certifications.length > 1 && !r.selectedCertId,
  ).length;

  const canConfirm =
    !!mentorId &&
    reason.trim().length >= 10 &&
    pendingChoice === 0 &&
    willAssign > 0 &&
    !submitting &&
    !resolvedList.some((r) => r.loading);

  const handleOpenChange = (next: boolean) => {
    if (submitting && !next) return;
    if (!next) {
      setMentorId("");
      setResolutions({});
      setReason("");
      setResult(null);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    const pairs = resolvedList
      .filter((r) => r.selectedCertId !== null)
      .map((r) => ({ trainee_user_id: r.trainee_user_id, certification_id: r.selectedCertId! }));
    if (pairs.length === 0) {
      toast({ title: "No trainees with resolved certifications", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("assign_mentor_pairs_bulk" as any, {
        p_mentor_user_id: mentorId,
        p_pairs: pairs,
        p_reason: reason.trim(),
      } as any);
      if (error) throw error;
      const r = (data ?? {}) as BulkResult;
      setResult(r);
      queryClient.invalidateQueries({ queryKey: ["members-search"] });
      queryClient.invalidateQueries({ queryKey: ["list_mentor_trainees"] });
      if ((r.failed ?? 0) === 0) {
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err) {
      toast({
        title: "Bulk mentor assign failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk assign mentor — {selectedUserIds.length} trainees</DialogTitle>
          <DialogDescription>
            Pick a mentor, then resolve a certification per trainee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mentor</Label>
            <Select value={mentorId} onValueChange={setMentorId} disabled={submitting}>
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
          </div>

          {mentorId && (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
              {resolvedList.map((r) => (
                <div key={r.trainee_user_id} className="flex items-center gap-2 py-1 text-sm">
                  <span className="w-48 truncate">{r.trainee_label}</span>
                  {r.loading ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Resolving…
                    </span>
                  ) : r.error ? (
                    <span className="text-destructive">Error: {r.error}</span>
                  ) : r.certifications.length === 0 ? (
                    <span className="text-destructive">
                      No certification this mentor is qualified for — this trainee will be skipped
                    </span>
                  ) : r.certifications.length === 1 ? (
                    <span className="text-muted-foreground">
                      {r.certifications[0].certification_type} ({r.certifications[0].status})
                    </span>
                  ) : (
                    <Select
                      value={r.selectedCertId ?? ""}
                      onValueChange={(v) =>
                        setResolutions((prev) => ({
                          ...prev,
                          [r.trainee_user_id]: { ...prev[r.trainee_user_id], selectedCertId: v },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 w-64">
                        <SelectValue placeholder="Choose certification…" />
                      </SelectTrigger>
                      <SelectContent>
                        {r.certifications.map((c) => (
                          <SelectItem key={c.certification_id} value={c.certification_id}>
                            {c.certification_type} ({c.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Justification reason</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="At least 10 characters…"
              disabled={submitting}
            />
            <div className="text-xs text-muted-foreground">
              {reason.trim().length}/10 minimum characters
            </div>
          </div>

          {mentorId && (
            <div className="text-sm text-muted-foreground">
              {willAssign} of {selectedUserIds.length} trainees will be assigned. {skipped} skipped.
            </div>
          )}

          {result && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">
                Done — succeeded: <span className="text-emerald-600">{result.succeeded ?? 0}</span>,
                failed: <span className="text-amber-600">{result.failed ?? 0}</span>
              </div>
              {(result.results ?? [])
                .filter((r) => r.status !== "success" && r.status !== "ok")
                .map((r, idx) => (
                  <div key={idx} className="mt-1 text-xs">
                    <span className="font-mono">{(r.user_id ?? "").slice(0, 8)}</span> — {r.status}
                    {r.detail && <span className="text-muted-foreground"> · {r.detail}</span>}
                  </div>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Close
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
