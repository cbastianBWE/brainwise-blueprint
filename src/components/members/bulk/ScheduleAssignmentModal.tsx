import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, GraduationCap, BookOpen, Layers, Users, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { MentorableCert, ScheduledAssignment } from "./types";

type AssignType = "cert_path" | "curriculum" | "module" | "mentor";

interface ScheduleAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledUserIds?: string[];
  traineeLabels?: Map<string, string>;
  onComplete: () => void;
}

const STATUSES = ["pending", "processing", "completed", "partial", "failed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const statusBadgeStyle: Record<Status, React.CSSProperties> = {
  pending: {
    backgroundColor: "color-mix(in oklab, var(--bw-amber) 18%, white)",
    color: "var(--bw-mustard)",
    borderColor: "color-mix(in oklab, var(--bw-amber) 35%, white)",
  },
  processing: {
    backgroundColor: "color-mix(in oklab, var(--bw-teal) 12%, white)",
    color: "var(--bw-teal)",
    borderColor: "color-mix(in oklab, var(--bw-teal) 30%, white)",
  },
  completed: {
    backgroundColor: "color-mix(in oklab, var(--bw-forest) 12%, white)",
    color: "var(--bw-forest)",
    borderColor: "color-mix(in oklab, var(--bw-forest) 30%, white)",
  },
  partial: {
    backgroundColor: "color-mix(in oklab, var(--bw-amber) 18%, white)",
    color: "var(--bw-mustard)",
    borderColor: "color-mix(in oklab, var(--bw-amber) 35%, white)",
  },
  failed: {
    backgroundColor: "color-mix(in oklab, hsl(var(--destructive)) 12%, white)",
    color: "hsl(var(--destructive))",
    borderColor: "color-mix(in oklab, hsl(var(--destructive)) 30%, white)",
  },
  cancelled: {
    backgroundColor: "color-mix(in oklab, var(--bw-slate) 10%, white)",
    color: "var(--bw-slate)",
    borderColor: "color-mix(in oklab, var(--bw-slate) 25%, white)",
  },
};

function TypeIcon({ type }: { type: AssignType }) {
  if (type === "cert_path") return <GraduationCap className="h-4 w-4" />;
  if (type === "curriculum") return <BookOpen className="h-4 w-4" />;
  if (type === "module") return <Layers className="h-4 w-4" />;
  return <Users className="h-4 w-4" />;
}

export default function ScheduleAssignmentModal({
  open,
  onOpenChange,
  prefilledUserIds,
  traineeLabels,
  onComplete,
}: ScheduleAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"create" | "pending">("create");

  // Create tab state
  const [type, setType] = useState<AssignType>("cert_path");
  const [targetId, setTargetId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Mentor flow
  const [mentorId, setMentorId] = useState("");
  const [traineeCerts, setTraineeCerts] = useState<Record<string, MentorableCert[]>>({});
  const [chosenCertId, setChosenCertId] = useState("");
  // User picker (when no prefill)
  const [userQuery, setUserQuery] = useState("");
  const [debouncedUserQuery, setDebouncedUserQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [pickerLabels, setPickerLabels] = useState<Map<string, string>>(new Map());

  // Pending tab state
  const [statusFilter, setStatusFilter] = useState<Status[] | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasPrefill = (prefilledUserIds?.length ?? 0) > 0;
  const traineeIds = useMemo(
    () => (hasPrefill ? prefilledUserIds! : Array.from(selectedUsers)),
    [hasPrefill, prefilledUserIds, selectedUsers],
  );
  const labelLookup = useMemo(() => {
    const m = new Map<string, string>();
    traineeLabels?.forEach((v, k) => m.set(k, v));
    pickerLabels.forEach((v, k) => m.set(k, v));
    return m;
  }, [traineeLabels, pickerLabels]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedUserQuery(userQuery), 250);
    return () => window.clearTimeout(id);
  }, [userQuery]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setActiveTab("create");
      setType("cert_path");
      setTargetId("");
      setScheduledDate("");
      setReason("");
      setMentorId("");
      setTraineeCerts({});
      setChosenCertId("");
      setUserQuery("");
      setSelectedUsers(new Set());
      setPickerLabels(new Map());
      setStatusFilter(null);
      setCancelTargetId(null);
      setExpandedId(null);
    }
  }, [open]);

  // Target option queries
  const certPathsQuery = useQuery({
    queryKey: ["certification-paths-list"],
    enabled: open && (type === "cert_path" || activeTab === "pending"),
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
    enabled: open && (type === "curriculum" || activeTab === "pending"),
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
    enabled: open && (type === "module" || activeTab === "pending"),
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

  const mentorsQuery = useQuery({
    queryKey: ["bulk-assign-mentors-list"],
    enabled: open && type === "mentor",
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

  // User search picker
  const userSearchQuery = useQuery({
    queryKey: ["schedule-user-search", debouncedUserQuery],
    enabled: open && !hasPrefill && debouncedUserQuery.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets" as any, {
        p_query: debouncedUserQuery,
        p_limit: 25,
        p_offset: 0,
        p_account_types: null,
        p_is_mentor: null,
        p_account_status_in: null,
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

  // Mentor cert resolution
  useEffect(() => {
    if (type !== "mentor" || !mentorId || traineeIds.length === 0) {
      setTraineeCerts({});
      setChosenCertId("");
      return;
    }
    let cancelled = false;
    Promise.all(
      traineeIds.map(async (tid) => {
        const { data, error } = await supabase.rpc("get_mentorable_certifications" as any, {
          p_mentor_user_id: mentorId,
          p_trainee_user_id: tid,
        } as any);
        if (error) return [tid, [] as MentorableCert[]] as const;
        const certs = ((data as { certifications?: MentorableCert[] })?.certifications ?? []);
        return [tid, certs] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, MentorableCert[]> = {};
      pairs.forEach(([tid, certs]) => {
        next[tid] = certs;
      });
      setTraineeCerts(next);
      setChosenCertId("");
    });
    return () => {
      cancelled = true;
    };
  }, [type, mentorId, traineeIds]);

  const certUnion = useMemo(() => {
    if (type !== "mentor") return [] as MentorableCert[];
    const seen = new Map<string, MentorableCert>();
    Object.values(traineeCerts).forEach((arr) => {
      arr.forEach((c) => {
        if (!seen.has(c.certification_id)) seen.set(c.certification_id, c);
      });
    });
    return Array.from(seen.values());
  }, [type, traineeCerts]);

  const mentorIncludedTraineeIds = useMemo(() => {
    if (type !== "mentor" || !chosenCertId) return traineeIds;
    return traineeIds.filter((tid) => (traineeCerts[tid] ?? []).some((c) => c.certification_id === chosenCertId));
  }, [type, chosenCertId, traineeIds, traineeCerts]);

  // Pending list
  const scheduledQuery = useQuery({
    queryKey: ["list_scheduled_assignments"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_scheduled_assignments" as any, {} as any);
      if (error) throw error;
      return ((data as { scheduled_assignments?: ScheduledAssignment[] })?.scheduled_assignments ?? []) as ScheduledAssignment[];
    },
    staleTime: 10_000,
  });

  const pendingCount = (scheduledQuery.data ?? []).filter((s) => s.status === "pending").length;

  const filteredScheduled = useMemo(() => {
    const rows = scheduledQuery.data ?? [];
    const filtered = statusFilter ? rows.filter((r) => statusFilter.includes(r.status as Status)) : rows;
    return [...filtered].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  }, [scheduledQuery.data, statusFilter]);

  // Target name lookups for expanded view
  const targetNameLookup = (assignType: string, tid: string): string => {
    if (assignType === "cert_path") return certPathsQuery.data?.find((c) => c.id === tid)?.name ?? tid.slice(0, 8);
    if (assignType === "curriculum") return curriculaQuery.data?.find((c) => c.id === tid)?.name ?? tid.slice(0, 8);
    if (assignType === "module") return modulesQuery.data?.find((c) => c.id === tid)?.name ?? tid.slice(0, 8);
    return tid.slice(0, 8);
  };

  const targetOptions =
    type === "cert_path"
      ? certPathsQuery.data ?? []
      : type === "curriculum"
        ? curriculaQuery.data ?? []
        : type === "module"
          ? modulesQuery.data ?? []
          : [];

  // Validation
  const finalUserIds = type === "mentor" ? mentorIncludedTraineeIds : traineeIds;
  const canSubmit =
    !!type &&
    !!scheduledDate &&
    reason.trim().length >= 10 &&
    finalUserIds.length > 0 &&
    !submitting &&
    (type === "mentor"
      ? !!mentorId && !!chosenCertId
      : !!targetId);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const targetIdToSend = type === "mentor" ? mentorId : targetId;
      const { error } = await supabase.rpc("create_scheduled_assignment" as any, {
        p_assignment_type: type,
        p_target_id: targetIdToSend,
        p_user_ids: finalUserIds,
        p_scheduled_for: scheduledDate,
        p_reason: reason.trim(),
        p_mentor_certification_id: type === "mentor" ? chosenCertId : null,
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["list_scheduled_assignments"] });
      toast({ title: "Scheduled", description: `Will fire on ${scheduledDate}` });
      onComplete();
      setActiveTab("pending");
    } catch (err) {
      toast({
        title: "Schedule failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = (s: Status) => {
    setStatusFilter((prev) => {
      const cur = prev ?? [];
      const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
      return next.length === 0 ? null : next;
    });
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    const { error } = await supabase.rpc("cancel_scheduled_assignment" as any, {
      p_id: cancelTargetId,
    } as any);
    if (error) {
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Scheduled assignment cancelled" });
      queryClient.invalidateQueries({ queryKey: ["list_scheduled_assignments"] });
    }
    setCancelTargetId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Schedule assignment</DialogTitle>
          <DialogDescription>
            Queue an assignment to fire on a future date, or review pending ones.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "pending")}>
          <TabsList>
            <TabsTrigger value="create">Create new</TabsTrigger>
            <TabsTrigger value="pending">Scheduled ({pendingCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label>Assignment type</Label>
              <RadioGroup
                value={type}
                onValueChange={(v) => {
                  setType(v as AssignType);
                  setTargetId("");
                  setMentorId("");
                  setChosenCertId("");
                }}
                className="flex flex-wrap gap-4"
              >
                {(["cert_path", "curriculum", "module", "mentor"] as AssignType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={t} /> {t.replace("_", " ")}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {type !== "mentor" && (
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={targetId} onValueChange={setTargetId}>
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
            )}

            {type === "mentor" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Mentor</Label>
                  <Select value={mentorId} onValueChange={setMentorId}>
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
                <div
                  className="rounded-md border p-2 text-xs"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--bw-amber) 18%, white)",
                    color: "var(--bw-mustard)",
                    borderColor: "color-mix(in oklab, var(--bw-amber) 35%, white)",
                  }}
                >
                  Scheduled mentor assignments support one certification for all selected trainees.
                  For per-trainee certifications, use the immediate Bulk Assign Mentor flow.
                </div>
                {mentorId && certUnion.length > 0 && (
                  <div className="space-y-2">
                    <Label>Certification (applied to all trainees)</Label>
                    <Select value={chosenCertId} onValueChange={setChosenCertId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick certification…" />
                      </SelectTrigger>
                      <SelectContent>
                        {certUnion.map((c) => (
                          <SelectItem key={c.certification_id} value={c.certification_id}>
                            {c.certification_type} ({c.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {mentorId && chosenCertId && (
                  <div className="text-xs text-muted-foreground">
                    {mentorIncludedTraineeIds.length} of {traineeIds.length} trainees will be
                    scheduled. {traineeIds.length - mentorIncludedTraineeIds.length} skipped (no
                    matching certification).
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Users</Label>
              {hasPrefill ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {prefilledUserIds!.length} users from current selection.
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Search by name or email (min 2 chars)…"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto rounded-md border">
                    {(userSearchQuery.data ?? []).map((u) => {
                      const checked = selectedUsers.has(u.user_id);
                      const label = u.full_name ?? u.email ?? u.user_id.slice(0, 8);
                      return (
                        <button
                          key={u.user_id}
                          type="button"
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-muted ${checked ? "bg-muted/60" : ""}`}
                          onClick={() => {
                            setSelectedUsers((prev) => {
                              const next = new Set(prev);
                              if (next.has(u.user_id)) next.delete(u.user_id);
                              else next.add(u.user_id);
                              return next;
                            });
                            setPickerLabels((prev) => {
                              const next = new Map(prev);
                              next.set(u.user_id, label);
                              return next;
                            });
                          }}
                        >
                          <span>{label}</span>
                          {checked && <Badge variant="outline">selected</Badge>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedUsers.size} user(s) selected
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Scheduled date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Justification reason</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="At least 10 characters…"
              />
              <div className="text-xs text-muted-foreground">
                {reason.trim().length}/10 minimum characters
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Close
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={statusFilter === null ? "default" : "outline"}
                onClick={() => setStatusFilter(null)}
              >
                All
              </Button>
              {STATUSES.map((s) => {
                const active = statusFilter?.includes(s) ?? false;
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleStatus(s)}
                    className="capitalize"
                  >
                    {s}
                  </Button>
                );
              })}
            </div>

            {scheduledQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : filteredScheduled.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground italic">
                No scheduled assignments match this filter.
              </div>
            ) : (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                {filteredScheduled.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <div key={row.id} className="rounded-md border">
                      <div className="flex flex-wrap items-center gap-3 p-3 text-sm">
                        <span className="font-medium">
                          {format(new Date(row.scheduled_for), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <TypeIcon type={row.assignment_type as AssignType} />
                          {row.assignment_type.replace("_", " ")}
                        </span>
                        <span className="text-muted-foreground">{row.user_count} users</span>
                        <Badge variant="outline" className="border" style={statusBadgeStyle[row.status as Status]}>
                          {row.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          by {row.scheduled_by_name}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {row.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCancelTargetId(row.id)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                          >
                            {expanded ? "Hide" : "View details"}
                          </Button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="border-t bg-muted/20 p-3 text-xs space-y-2">
                          <div>
                            <span className="font-semibold">Target: </span>
                            {targetNameLookup(row.assignment_type, row.target_id)}
                          </div>
                          <div>
                            <span className="font-semibold">Reason: </span>
                            {row.reason}
                          </div>
                          {(row.status === "completed" ||
                            row.status === "partial" ||
                            row.status === "failed") && (
                            <div>
                              <div className="font-semibold mb-1">Result</div>
                              <pre className="overflow-x-auto rounded border bg-background p-2 text-[11px]">
                                {JSON.stringify(row.result ?? null, null, 2)}
                              </pre>
                            </div>
                          )}
                          {row.status === "cancelled" && row.failure_summary && (
                            <div className="text-muted-foreground">{row.failure_summary}</div>
                          )}
                          <div>
                            <span className="font-semibold">User IDs: </span>
                            {row.user_ids.slice(0, 10).join(", ")}
                            {row.user_ids.length > 10 && (
                              <span className="text-muted-foreground">
                                {" "}…and {row.user_ids.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog
        open={!!cancelTargetId}
        onOpenChange={(o) => !o && setCancelTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this scheduled assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              It will not run on its scheduled date. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              Cancel assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
