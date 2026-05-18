import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Loader2,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Layers,
  Download,
  Upload,
  CalendarClock,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import TraineeMultiSelect from "@/components/learning-admin/TraineeMultiSelect";
import ResultPanel, { type BulkResult } from "@/components/learning-admin/ResultPanel";

// ---------- shared types ----------

type AssignType = "cert_path" | "curriculum" | "module" | "mentor";

interface OptionRow {
  id: string;
  name: string;
}

interface Trainee {
  trainee_user_id: string;
  full_name: string | null;
  email: string | null;
}

interface CurriculumAssignmentRow {
  assignment_id: string;
  trainee_user_id: string;
  trainee_full_name: string | null;
  trainee_email: string | null;
  curriculum_name: string | null;
  source: string | null;
  status: string | null;
}
interface ModuleAssignmentRow {
  assignment_id: string;
  trainee_user_id: string;
  trainee_full_name: string | null;
  trainee_email?: string | null;
  module_name: string | null;
  status: string | null;
}
interface MentorAssignmentRow {
  assignment_id: string;
  trainee_user_id: string;
  trainee_full_name: string | null;
  trainee_email?: string | null;
  mentor_full_name: string | null;
}

type ScheduledStatus =
  | "pending"
  | "processing"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";

interface ScheduledRow {
  id: string;
  assignment_type: string;
  user_count: number;
  scheduled_for: string;
  status: ScheduledStatus;
  reason: string | null;
  scheduled_by_name: string | null;
  created_at: string;
  processed_at: string | null;
  result: unknown;
  failure_summary: string | null;
}

interface ImportRowResult {
  row_number: number;
  status: string;
  detail: string | null;
}
interface ImportResult {
  total: number;
  succeeded: number;
  failed: number;
  rows: ImportRowResult[];
}

interface ImportReference {
  certification_paths: { id: string; name: string }[];
  curricula: { id: string; name: string }[];
  modules: { id: string; name: string }[];
  mentors: { user_id: string; full_name: string | null; email: string | null }[];
}

const TYPE_LABEL: Record<AssignType, string> = {
  cert_path: "Certification Path",
  curriculum: "Curriculum",
  module: "Module",
  mentor: "Mentor",
};

const INVALIDATE_KEYS = [
  ["list_all_learning_assignments"],
  ["get_user_learning_state"],
  ["list_mentor_trainees"],
] as const;

// ---------- Tab 1: Trainees ----------

interface SearchRow {
  user_id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  organization_id: string | null;
  organization_name: string | null;
  total_count: number;
}

const PAGE_SIZE = 25;

const formatAccountType = (t: string | null): string => {
  if (!t) return "Unknown";
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const accountTypeBadgeVariant = (
  t: string | null,
): "default" | "secondary" | "destructive" | "outline" => {
  if (!t) return "outline";
  switch (t) {
    case "brainwise_super_admin":
      return "destructive";
    case "org_admin":
    case "company_admin":
      return "default";
    case "coach":
      return "secondary";
    default:
      return "outline";
  }
};

type SingleAssignMode = "cert_path" | "curriculum" | "module";

function SingleUserAssignDialog({
  open,
  mode,
  trainee,
  onClose,
}: {
  open: boolean;
  mode: SingleAssignMode | null;
  trainee: SearchRow | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  useEffect(() => {
    if (!open) {
      setTargetId("");
      setReason("");
      setResult(null);
      setSubmitting(false);
    }
  }, [open]);

  const certPathsQuery = useQuery({
    queryKey: ["la_single_cert_paths"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_paths")
        .select("id,name")
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as OptionRow[];
    },
    enabled: open && mode === "cert_path",
  });
  const curriculaQuery = useQuery({
    queryKey: ["la_single_curricula"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curricula")
        .select("id,name")
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as OptionRow[];
    },
    enabled: open && mode === "curriculum",
  });
  const modulesQuery = useQuery({
    queryKey: ["la_single_modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id,name")
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as OptionRow[];
    },
    enabled: open && mode === "module",
  });

  const opts: OptionRow[] =
    mode === "cert_path"
      ? certPathsQuery.data ?? []
      : mode === "curriculum"
        ? curriculaQuery.data ?? []
        : mode === "module"
          ? modulesQuery.data ?? []
          : [];

  const loadingOpts =
    (mode === "cert_path" && certPathsQuery.isLoading) ||
    (mode === "curriculum" && curriculaQuery.isLoading) ||
    (mode === "module" && modulesQuery.isLoading);

  const handleConfirm = async () => {
    if (!trainee || !mode) return;
    if (!targetId) {
      toast({ title: "Select a target", variant: "destructive" });
      return;
    }
    if (reason.trim().length < 10) {
      toast({
        title: "Justification must be at least 10 characters",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      let rpcName: string;
      let payload: any;
      if (mode === "cert_path") {
        rpcName = "enroll_users_in_certification_path_bulk";
        payload = {
          p_user_ids: [trainee.user_id],
          p_certification_path_id: targetId,
          p_reason: reason,
          p_due_at: null,
        };
      } else if (mode === "curriculum") {
        rpcName = "assign_curriculum_bulk";
        payload = {
          p_user_ids: [trainee.user_id],
          p_curriculum_id: targetId,
          p_source: "direct_assignment",
          p_certification_id: null,
          p_source_reference_id: null,
          p_due_at: null,
          p_reason: reason,
        };
      } else {
        rpcName = "assign_module_bulk";
        payload = {
          p_user_ids: [trainee.user_id],
          p_module_id: targetId,
          p_source: "direct_assignment",
          p_source_reference_id: null,
          p_due_at: null,
          p_reason: reason,
        };
      }
      const { data, error } = await supabase.rpc(rpcName as never, payload as never);
      if (error) throw error;
      setResult(data as BulkResult);
      INVALIDATE_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: key as unknown as any[] }));
    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "cert_path"
      ? "Assign certification path"
      : mode === "curriculum"
        ? "Assign curriculum"
        : "Assign module";

  const targetLabel =
    mode === "cert_path"
      ? "Certification Path"
      : mode === "curriculum"
        ? "Curriculum"
        : "Module";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {trainee && (
            <DialogDescription>
              For trainee:{" "}
              <span className="font-medium text-foreground">
                {trainee.full_name || trainee.email}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{targetLabel}</label>
            <Select value={targetId} onValueChange={setTargetId} disabled={loadingOpts}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingOpts ? "Loading…" : `Choose a ${targetLabel.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {opts.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Justification (min 10 chars)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being assigned?"
              rows={3}
            />
          </div>
          <ResultPanel result={result} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Close
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

function TraineesTab() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [dialogMode, setDialogMode] = useState<SingleAssignMode | null>(null);
  const [dialogTrainee, setDialogTrainee] = useState<SearchRow | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery]);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ["learning-admin-users", debouncedQuery, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_impersonation_targets", {
        p_query: debouncedQuery.length >= 2 ? debouncedQuery : null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      } as any);
      if (error) throw error;
      return (data ?? []) as SearchRow[];
    },
    staleTime: 30_000,
  });

  const totalCount = Number(results?.[0]?.total_count ?? 0);
  const showPagination = totalCount > PAGE_SIZE;

  const openAssign = (row: SearchRow, mode: SingleAssignMode) => {
    setDialogTrainee(row);
    setDialogMode(mode);
  };

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, or organization (min 2 characters)"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-sm text-destructive">Search failed. Please try again.</p>
                  <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !error && results && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  {debouncedQuery.length >= 2
                    ? `No learners matching "${debouncedQuery}".`
                    : "No learners found."}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !error &&
              results &&
              results.map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell>
                    {row.full_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <Badge variant={accountTypeBadgeVariant(row.account_type)}>
                      {formatAccountType(row.account_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.organization_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openAssign(row, "cert_path")}>
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Assign certification path
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openAssign(row, "curriculum")}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Assign curriculum
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openAssign(row, "module")}>
                          <Layers className="h-4 w-4 mr-2" />
                          Assign module
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
            {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SingleUserAssignDialog
        open={dialogMode !== null}
        mode={dialogMode}
        trainee={dialogTrainee}
        onClose={() => {
          setDialogMode(null);
          setDialogTrainee(null);
        }}
      />
    </div>
  );
}

// ---------- Tab 2: Assign / Unassign ----------

interface MentorableCert {
  certification_id: string;
  certification_type: string;
  status: string;
}
interface MentorResolution {
  trainee_user_id: string;
  loading: boolean;
  certifications: MentorableCert[];
  selectedCertId: string | null;
  error: string | null;
}


function AssignUnassignTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [op, setOp] = useState<"assign" | "unassign">("assign");
  const [type, setType] = useState<AssignType>("cert_path");

  // Assign state
  const [traineeIds, setTraineeIds] = useState<string[]>([]);
  const [targetId, setTargetId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assignResult, setAssignResult] = useState<BulkResult | null>(null);

  // Unassign state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [unassignReason, setUnassignReason] = useState("");
  const [unassignSubmitting, setUnassignSubmitting] = useState(false);
  const [unassignResult, setUnassignResult] = useState<BulkResult | null>(null);
  const [tableSearch, setTableSearch] = useState("");

  // Scheduling state
  const [dueDate, setDueDate] = useState("");
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [mentorCertId, setMentorCertId] = useState<string>("");

  // Per-trainee mentor certification resolution
  const [mentorResolutions, setMentorResolutions] = useState<Record<string, MentorResolution>>({});

  // Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Cancel-schedule state
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const onTypeChange = (v: AssignType) => {
    setType(v);
    setTargetId("");
    setMentorId("");
    setSelectedRows([]);
    setUnassignResult(null);
    setAssignResult(null);
    setTableSearch("");
  };

  const invalidate = () => {
    INVALIDATE_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: key as unknown as any[] }));
    qc.invalidateQueries({ queryKey: ["list_scheduled_assignments"] });
  };

  // Always-loaded queries for import + scheduling
  const certPathsAllQuery = useQuery({
    queryKey: ["la_certification_paths_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_paths")
        .select("id,name")
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as OptionRow[];
    },
  });

  const importReferenceQuery = useQuery({
    queryKey: ["get_learning_import_reference"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_learning_import_reference" as never,
        {} as never,
      );
      if (error) throw error;
      return data as ImportReference;
    },
  });

  const scheduledQuery = useQuery({
    queryKey: ["list_scheduled_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "list_scheduled_assignments" as never,
        {} as never,
      );
      if (error) throw error;
      return data as { scheduled_assignments: ScheduledRow[] };
    },
  });

  // Target options
  const certPathsQuery = useQuery({
    queryKey: ["la_certification_paths"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certification_paths")
        .select("id,name")
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as OptionRow[];
    },
    enabled: op === "assign" && type === "cert_path",
  });
  const curriculaQuery = useQuery({
    queryKey: ["la_curricula"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curricula")
        .select("id,name")
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as OptionRow[];
    },
    enabled: op === "assign" && type === "curriculum",
  });
  const modulesQuery = useQuery({
    queryKey: ["la_modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id,name")
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as OptionRow[];
    },
    enabled: op === "assign" && type === "module",
  });
  const mentorListQuery = useQuery({
    queryKey: ["list_mentor_trainees"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mentor_trainees" as never, {} as never);
      if (error) throw error;
      return data as { trainees: Trainee[] };
    },
    enabled: op === "assign" && type === "mentor",
  });

  // Reset mentor resolutions when mentor changes or context leaves
  useEffect(() => {
    setMentorResolutions({});
  }, [mentorId, type, op]);

  // Resolve per-trainee certifications for current mentor
  useEffect(() => {
    if (op !== "assign" || type !== "mentor" || !mentorId) return;
    setMentorResolutions((prev) => {
      const next: Record<string, MentorResolution> = {};
      for (const id of traineeIds) if (prev[id]) next[id] = prev[id];
      return next;
    });
    const missing = traineeIds.filter((id) => !mentorResolutions[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    setMentorResolutions((prev) => {
      const next = { ...prev };
      for (const id of missing) {
        next[id] = {
          trainee_user_id: id,
          loading: true,
          certifications: [],
          selectedCertId: null,
          error: null,
        };
      }
      return next;
    });
    (async () => {
      await Promise.all(
        missing.map(async (traineeId) => {
          try {
            const { data, error } = await supabase.rpc(
              "get_mentorable_certifications" as never,
              { p_mentor_user_id: mentorId, p_trainee_user_id: traineeId } as never,
            );
            if (error) throw error;
            const certs =
              ((data as { certifications?: MentorableCert[] })?.certifications ?? []) as
                MentorableCert[];
            if (cancelled) return;
            setMentorResolutions((prev) => ({
              ...prev,
              [traineeId]: {
                trainee_user_id: traineeId,
                loading: false,
                certifications: certs,
                selectedCertId: certs.length === 1 ? certs[0].certification_id : null,
                error: null,
              },
            }));
          } catch (err: any) {
            if (cancelled) return;
            setMentorResolutions((prev) => ({
              ...prev,
              [traineeId]: {
                trainee_user_id: traineeId,
                loading: false,
                certifications: [],
                selectedCertId: null,
                error: err?.message ?? "Failed to load",
              },
            }));
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeIds, mentorId, type, op]);

  // Unassign table data
  const allAssignmentsQuery = useQuery({
    queryKey: ["list_all_learning_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "list_all_learning_assignments" as never,
        {} as never,
      );
      if (error) throw error;
      return data as {
        curriculum_assignments: CurriculumAssignmentRow[];
        module_assignments: ModuleAssignmentRow[];
        mentor_assignments: MentorAssignmentRow[];
      };
    },
    enabled: op === "unassign",
  });

  const handleAssign = async () => {
    if (traineeIds.length === 0) {
      toast({ title: "Select at least one trainee", variant: "destructive" });
      return;
    }
    if (type !== "mentor" && !targetId) {
      toast({ title: "Select a target", variant: "destructive" });
      return;
    }
    if (type === "mentor" && !mentorId) {
      toast({ title: "Select a mentor", variant: "destructive" });
      return;
    }
    if (reason.trim().length < 10) {
      toast({
        title: "Justification must be at least 10 characters",
        variant: "destructive",
      });
      return;
    }
    if (scheduleLater) {
      if (!scheduledFor) {
        toast({ title: "Pick a scheduled date", variant: "destructive" });
        return;
      }
      if (scheduledFor < todayStr) {
        toast({ title: "Scheduled date must be today or later", variant: "destructive" });
        return;
      }
      if (type === "mentor" && !mentorCertId) {
        toast({ title: "Select a certification for the mentor", variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    setAssignResult(null);
    try {
      const dueAtIso = dueDate ? new Date(dueDate + "T00:00:00").toISOString() : null;

      if (scheduleLater) {
        const targetForSchedule = type === "mentor" ? mentorId : targetId;
        const { data, error } = await supabase.rpc(
          "create_scheduled_assignment" as never,
          {
            p_assignment_type: type,
            p_target_id: targetForSchedule,
            p_user_ids: traineeIds,
            p_scheduled_for: scheduledFor,
            p_reason: reason,
            p_mentor_certification_id: type === "mentor" ? mentorCertId : null,
          } as never,
        );
        if (error) throw error;
        toast({ title: `Assignment scheduled for ${scheduledFor}` });
        setReason("");
        setDueDate("");
        setScheduleLater(false);
        setScheduledFor("");
        setMentorCertId("");
        setTraineeIds([]);
        invalidate();
        return;
      }

      let rpcName: string;
      let payload: any;
      if (type === "cert_path") {
        rpcName = "enroll_users_in_certification_path_bulk";
        payload = {
          p_user_ids: traineeIds,
          p_certification_path_id: targetId,
          p_reason: reason,
          p_due_at: dueAtIso,
        };
      } else if (type === "curriculum") {
        rpcName = "assign_curriculum_bulk";
        payload = {
          p_user_ids: traineeIds,
          p_curriculum_id: targetId,
          p_source: "direct_assignment",
          p_certification_id: null,
          p_source_reference_id: null,
          p_due_at: dueAtIso,
          p_reason: reason,
        };
      } else if (type === "module") {
        rpcName = "assign_module_bulk";
        payload = {
          p_user_ids: traineeIds,
          p_module_id: targetId,
          p_source: "direct_assignment",
          p_source_reference_id: null,
          p_due_at: dueAtIso,
          p_reason: reason,
        };
      } else {
        const pairs = traineeIds
          .map((id) => mentorResolutions[id])
          .filter((r) => r && r.selectedCertId)
          .map((r) => ({
            trainee_user_id: r!.trainee_user_id,
            certification_id: r!.selectedCertId,
          }));
        if (pairs.length === 0) {
          toast({
            title: "No trainees with a resolvable certification",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        const { data, error } = await supabase.rpc(
          "assign_mentor_pairs_bulk" as never,
          {
            p_mentor_user_id: mentorId,
            p_pairs: pairs,
            p_reason: reason,
          } as never,
        );
        if (error) throw error;
        setAssignResult(data as BulkResult);
        setMentorResolutions({});
        setTraineeIds([]);
        invalidate();
        return;
      }
      const { data, error } = await supabase.rpc(rpcName as never, payload as never);
      if (error) throw error;
      setAssignResult(data as BulkResult);
      invalidate();

    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------- Import handlers --------
  const handleDownloadTemplate = () => {
    const ref = importReferenceQuery.data;
    if (!ref) {
      toast({ title: "Reference data still loading…", variant: "destructive" });
      return;
    }
    const wb = XLSX.utils.book_new();
    const assignments = [
      ["operation", "type", "target_name", "user_email", "reason"],
      [
        "assign",
        "curriculum",
        ref.curricula[0]?.name ?? "Curriculum name",
        ref.mentors[0]?.email ?? "someone@example.com",
        "Example justification text",
      ],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(assignments),
      "Assignments",
    );

    const certNames = ref.certification_paths.map((c) => c.name);
    const curNames = ref.curricula.map((c) => c.name);
    const modNames = ref.modules.map((m) => m.name);
    const mentorEmails = ref.mentors.map((m) => m.email ?? "");
    const max = Math.max(certNames.length, curNames.length, modNames.length, mentorEmails.length);
    const refRows: string[][] = [
      ["Certification Paths", "Curricula", "Modules", "Mentor Emails"],
    ];
    for (let i = 0; i < max; i++) {
      refRows.push([
        certNames[i] ?? "",
        curNames[i] ?? "",
        modNames[i] ?? "",
        mentorEmails[i] ?? "",
      ]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(refRows), "Reference");
    XLSX.writeFile(wb, "learning-admin-import-template.xlsx");
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.includes("Assignments")
        ? "Assignments"
        : wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows = json
        .map((r, idx) => ({
          row_number: idx + 2,
          operation: String(r.operation ?? "").trim(),
          type: String(r.type ?? "").trim(),
          target_name: String(r.target_name ?? "").trim(),
          user_email: String(r.user_email ?? "").trim(),
          reason: String(r.reason ?? "").trim(),
        }))
        .filter(
          (r) => r.operation || r.type || r.target_name || r.user_email || r.reason,
        );
      if (rows.length === 0) {
        toast({ title: "No rows found in the spreadsheet", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("learning-admin-import", {
        body: { rows },
      });
      if (error) throw error;
      setImportResult(data as ImportResult);
      invalidate();
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCancelSchedule = async () => {
    if (!cancelTargetId) return;
    setCancelling(true);
    try {
      const { error } = await supabase.rpc(
        "cancel_scheduled_assignment" as never,
        { p_id: cancelTargetId } as never,
      );
      if (error) throw error;
      toast({ title: "Scheduled assignment cancelled" });
      qc.invalidateQueries({ queryKey: ["list_scheduled_assignments"] });
    } catch (err: any) {
      toast({
        title: "Cancel failed",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
      setCancelTargetId(null);
    }
  };

  const handleUnassign = async () => {
    if (selectedRows.length === 0) {
      toast({ title: "Select at least one row", variant: "destructive" });
      return;
    }
    if (unassignReason.trim().length < 10) {
      toast({
        title: "Justification must be at least 10 characters",
        variant: "destructive",
      });
      return;
    }
    setUnassignSubmitting(true);
    setUnassignResult(null);
    try {
      let rpcName: string;
      let payload: any;
      if (type === "curriculum") {
        rpcName = "unassign_curriculum_bulk";
        payload = { p_assignment_ids: selectedRows, p_reason: unassignReason };
      } else if (type === "module") {
        rpcName = "unassign_module_bulk";
        payload = { p_assignment_ids: selectedRows, p_reason: unassignReason };
      } else if (type === "mentor") {
        rpcName = "unassign_mentor_bulk";
        payload = {
          p_assignment_ids: selectedRows,
          p_end_reason: "removed_by_admin",
          p_reason: unassignReason,
        };
      } else {
        return;
      }
      const { data, error } = await supabase.rpc(rpcName as never, payload as never);
      if (error) throw error;
      setUnassignResult(data as BulkResult);
      setSelectedRows([]);
      invalidate();
    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setUnassignSubmitting(false);
    }
  };

  const filteredRows = useMemo(() => {
    const data = allAssignmentsQuery.data;
    if (!data) return [] as any[];
    const q = tableSearch.trim().toLowerCase();
    const match = (...fields: (string | null | undefined)[]) =>
      !q || fields.some((f) => (f ?? "").toLowerCase().includes(q));
    if (type === "curriculum") {
      return (data.curriculum_assignments ?? []).filter((r) =>
        match(r.trainee_full_name, r.trainee_email, r.curriculum_name),
      );
    }
    if (type === "module") {
      return (data.module_assignments ?? []).filter((r) =>
        match(r.trainee_full_name, r.trainee_email, r.module_name),
      );
    }
    if (type === "mentor") {
      return (data.mentor_assignments ?? []).filter((r) =>
        match(r.trainee_full_name, r.trainee_email, r.mentor_full_name),
      );
    }
    return [];
  }, [allAssignmentsQuery.data, type, tableSearch]);

  const toggleRow = (id: string) =>
    setSelectedRows((rows) => (rows.includes(id) ? rows.filter((r) => r !== id) : [...rows, id]));

  // -------- render assign panel --------
  const renderTargetPicker = () => {
    if (type === "cert_path") {
      const opts = certPathsQuery.data ?? [];
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">Certification Path</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  certPathsQuery.isLoading ? "Loading…" : "Choose a certification path"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (type === "curriculum") {
      const opts = curriculaQuery.data ?? [];
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">Curriculum</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger>
              <SelectValue
                placeholder={curriculaQuery.isLoading ? "Loading…" : "Choose a curriculum"}
              />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (type === "module") {
      const opts = modulesQuery.data ?? [];
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">Module</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger>
              <SelectValue
                placeholder={modulesQuery.isLoading ? "Loading…" : "Choose a module"}
              />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    const opts = mentorListQuery.data?.trainees ?? [];
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Mentor</label>
        <Select value={mentorId} onValueChange={setMentorId}>
          <SelectTrigger>
            <SelectValue
              placeholder={mentorListQuery.isLoading ? "Loading…" : "Choose a mentor"}
            />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o.trainee_user_id} value={o.trainee_user_id}>
                {o.full_name || o.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderUnassignTable = () => {
    if (type === "cert_path") {
      return (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          Certification revocation is handled individually.
        </div>
      );
    }
    if (allAssignmentsQuery.isLoading) {
      return (
        <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading assignments…
        </div>
      );
    }
    if (filteredRows.length === 0) {
      return (
        <div className="rounded-md border p-6 text-sm text-muted-foreground text-center">
          No assignments found.
        </div>
      );
    }
    const allSelected =
      filteredRows.length > 0 &&
      filteredRows.every((r: any) => selectedRows.includes(r.assignment_id));
    const toggleAll = () => {
      if (allSelected) {
        setSelectedRows((rows) =>
          rows.filter((r) => !filteredRows.find((x: any) => x.assignment_id === r)),
        );
      } else {
        const ids = filteredRows.map((r: any) => r.assignment_id);
        setSelectedRows((rows) => Array.from(new Set([...rows, ...ids])));
      }
    };
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Trainee</TableHead>
              {type === "curriculum" && (
                <>
                  <TableHead>Curriculum</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </>
              )}
              {type === "module" && (
                <>
                  <TableHead>Module</TableHead>
                  <TableHead>Status</TableHead>
                </>
              )}
              {type === "mentor" && <TableHead>Mentor</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((r: any) => (
              <TableRow key={r.assignment_id}>
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(r.assignment_id)}
                    onCheckedChange={() => toggleRow(r.assignment_id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">
                    {r.trainee_full_name || "(no name)"}
                  </div>
                  {r.trainee_email && (
                    <div className="text-xs text-muted-foreground">{r.trainee_email}</div>
                  )}
                </TableCell>
                {type === "curriculum" && (
                  <>
                    <TableCell>{r.curriculum_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                  </>
                )}
                {type === "module" && (
                  <>
                    <TableCell>{r.module_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                  </>
                )}
                {type === "mentor" && <TableCell>{r.mentor_full_name}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Operation</label>
          <Tabs value={op} onValueChange={(v) => setOp(v as "assign" | "unassign")}>
            <TabsList>
              <TabsTrigger value="assign">Assign</TabsTrigger>
              <TabsTrigger value="unassign">Unassign</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-2 sm:w-64">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={(v) => onTypeChange(v as AssignType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cert_path">Certification Path</SelectItem>
              <SelectItem value="curriculum">Curriculum</SelectItem>
              <SelectItem value="module">Module</SelectItem>
              <SelectItem value="mentor">Mentor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {op === "assign" ? (
        <section className="space-y-4 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Assign {TYPE_LABEL[type]}</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Trainees</label>
            <TraineeMultiSelect selectedIds={traineeIds} onChange={setTraineeIds} />
          </div>
          {renderTargetPicker()}
          <div className="space-y-2">
            <label className="text-sm font-medium">Justification (min 10 chars)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being assigned?"
              rows={3}
            />
          </div>
          {type !== "mentor" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Due date (optional)</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}
          <div className="space-y-3 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Checkbox
                checked={scheduleLater}
                onCheckedChange={(v) => setScheduleLater(!!v)}
              />
              Schedule for a future date instead of assigning now
            </label>
            {scheduleLater && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scheduled date</label>
                  <Input
                    type="date"
                    min={todayStr}
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </div>
                {type === "mentor" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Certification</label>
                    <Select value={mentorCertId} onValueChange={setMentorCertId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            certPathsAllQuery.isLoading
                              ? "Loading…"
                              : "Choose a certification"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(certPathsAllQuery.data ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Button onClick={handleAssign} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {scheduleLater ? "Schedule assignment" : "Confirm assignment"}
            </Button>
          </div>
          <ResultPanel result={assignResult} />
        </section>
      ) : (
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Unassign {TYPE_LABEL[type]}</h2>
            {type !== "cert_path" && (
              <Input
                placeholder="Search trainee or target name…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="max-w-sm"
              />
            )}
          </div>
          {renderUnassignTable()}
          {type !== "cert_path" && (
            <div className="space-y-2">
              <Textarea
                placeholder="Justification (min 10 chars)"
                value={unassignReason}
                onChange={(e) => setUnassignReason(e.target.value)}
                rows={2}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="destructive"
                  onClick={handleUnassign}
                  disabled={unassignSubmitting || selectedRows.length === 0}
                >
                  {unassignSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Unassign {selectedRows.length > 0 ? `(${selectedRows.length})` : ""}
                </Button>
              </div>
              <ResultPanel result={unassignResult} />
            </div>
          )}
        </section>
      )}

      {/* ---------- Import from spreadsheet ---------- */}
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import from spreadsheet
            </h2>
            <p className="text-sm text-muted-foreground">
              Download the template, fill in assign/unassign rows, then upload to apply in bulk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={importReferenceQuery.isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download template
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Upload className="h-4 w-4 mr-2" />
              Upload spreadsheet
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>
        {importResult && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">
              {importResult.succeeded} of {importResult.total} succeeded, {importResult.failed}{" "}
              failed
            </div>
            {importResult.rows.filter((r) => r.status !== "success").length > 0 && (
              <ul className="text-sm text-destructive space-y-1 max-h-60 overflow-y-auto">
                {importResult.rows
                  .filter((r) => r.status !== "success")
                  .map((r) => (
                    <li key={r.row_number}>
                      Row {r.row_number}: {r.detail ?? r.status}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ---------- Scheduled assignments ---------- */}
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Scheduled assignments
        </h2>
        {scheduledQuery.isLoading ? (
          <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
          </div>
        ) : (scheduledQuery.data?.scheduled_assignments ?? []).length === 0 ? (
          <div className="rounded-md border p-6 text-sm text-muted-foreground text-center">
            No scheduled assignments.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead># learners</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled by</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(scheduledQuery.data?.scheduled_assignments ?? []).map((row) => {
                  const variant: "default" | "secondary" | "destructive" | "outline" =
                    row.status === "failed"
                      ? "destructive"
                      : row.status === "cancelled"
                        ? "outline"
                        : row.status === "pending" || row.status === "completed"
                          ? "default"
                          : "secondary";
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.scheduled_for}</TableCell>
                      <TableCell>{row.assignment_type}</TableCell>
                      <TableCell>{row.user_count}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={variant}>{row.status}</Badge>
                          {(row.status === "partial" || row.status === "failed") &&
                            row.failure_summary && (
                              <div className="text-xs text-muted-foreground max-w-xs">
                                {row.failure_summary}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>{row.scheduled_by_name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.status === "pending" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelTargetId(row.id)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <AlertDialog
        open={!!cancelTargetId}
        onOpenChange={(o) => !o && !cancelling && setCancelTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the scheduled assignment as cancelled. It will not run.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSchedule} disabled={cancelling}>
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Page shell ----------

export default function LearningAdmin() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Learning Admin</h1>
        <p className="text-muted-foreground">
          Browse learners and manage learning assignments across trainees.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage learning</CardTitle>
          <CardDescription>Per-trainee actions and bulk assign/unassign.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trainees">
            <TabsList>
              <TabsTrigger value="trainees">Trainees</TabsTrigger>
              <TabsTrigger value="assign">Assign / Unassign</TabsTrigger>
            </TabsList>
            <TabsContent value="trainees" className="pt-4">
              <TraineesTab />
            </TabsContent>
            <TabsContent value="assign" className="pt-4">
              <AssignUnassignTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
