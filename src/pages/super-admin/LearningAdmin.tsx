import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import TraineeMultiSelect from "@/components/learning-admin/TraineeMultiSelect";

type AssignType = "cert_path" | "curriculum" | "module" | "mentor";

interface BulkResult {
  operation?: string;
  requested?: number;
  succeeded?: number;
  failed?: number;
  results?: Array<{ status?: string; detail?: string; [k: string]: any }>;
}

interface OptionRow { id: string; name: string }

interface Trainee { trainee_user_id: string; full_name: string | null; email: string | null }

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

function ResultPanel({ result }: { result: BulkResult | null }) {
  if (!result) return null;
  const failed = result.failed ?? 0;
  const failures = (result.results ?? []).filter((r) => (r.status ?? "").toLowerCase() !== "success");
  return (
    <div className="mt-4 rounded-md border p-3 text-sm bg-muted/30">
      <div className="font-medium">
        {result.succeeded ?? 0} of {result.requested ?? 0} succeeded, {failed} failed
      </div>
      {failed > 0 && failures.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {failures.map((f, i) => (
            <li key={i} className="text-destructive">
              <span className="font-mono">{f.status ?? "failed"}</span>
              {f.detail ? ` — ${f.detail}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<AssignType, string> = {
  cert_path: "Certification Path",
  curriculum: "Curriculum",
  module: "Module",
  mentor: "Mentor",
};

export default function LearningAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState<AssignType>("cert_path");
  const [assignOpen, setAssignOpen] = useState(false);

  // Assign dialog state
  const [traineeIds, setTraineeIds] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string>("");
  const [mentorId, setMentorId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assignResult, setAssignResult] = useState<BulkResult | null>(null);

  // Unassign state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [unassignReason, setUnassignReason] = useState("");
  const [unassignSubmitting, setUnassignSubmitting] = useState(false);
  const [unassignResult, setUnassignResult] = useState<BulkResult | null>(null);
  const [tableSearch, setTableSearch] = useState("");

  const resetAssign = () => {
    setTraineeIds([]);
    setTargetId("");
    setMentorId("");
    setReason("");
    setAssignResult(null);
  };

  const onTypeChange = (v: AssignType) => {
    setType(v);
    setSelectedRows([]);
    setUnassignResult(null);
    setTableSearch("");
  };

  // Target option queries
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
    enabled: type === "cert_path",
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
    enabled: type === "curriculum",
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
    enabled: type === "module",
  });

  // Mentor list (reuses trainees list per spec)
  const traineesListQuery = useQuery({
    queryKey: ["list_mentor_trainees"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mentor_trainees" as never, {} as never);
      if (error) throw error;
      return data as { trainees: Trainee[] };
    },
    enabled: type === "mentor",
  });

  // Unassign table data
  const allAssignmentsQuery = useQuery({
    queryKey: ["list_all_learning_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_all_learning_assignments" as never, {} as never);
      if (error) throw error;
      return data as {
        curriculum_assignments: CurriculumAssignmentRow[];
        module_assignments: ModuleAssignmentRow[];
        mentor_assignments: MentorAssignmentRow[];
      };
    },
  });

  const invalidateAfterChange = () => {
    queryClient.invalidateQueries({ queryKey: ["list_all_learning_assignments"] });
    queryClient.invalidateQueries({ queryKey: ["get_user_learning_state"] });
    queryClient.invalidateQueries({ queryKey: ["list_mentor_trainees"] });
  };

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
      toast({ title: "Justification must be at least 10 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setAssignResult(null);
    try {
      let payload: any;
      let rpcName: string;
      if (type === "cert_path") {
        rpcName = "enroll_users_in_certification_path_bulk";
        payload = {
          p_user_ids: traineeIds,
          p_certification_path_id: targetId,
          p_reason: reason,
          p_due_at: null,
        };
      } else if (type === "curriculum") {
        rpcName = "assign_curriculum_bulk";
        payload = {
          p_user_ids: traineeIds,
          p_curriculum_id: targetId,
          p_source: "direct_assignment",
          p_certification_id: null,
          p_source_reference_id: null,
          p_due_at: null,
          p_reason: reason,
        };
      } else if (type === "module") {
        rpcName = "assign_module_bulk";
        payload = {
          p_user_ids: traineeIds,
          p_module_id: targetId,
          p_source: "direct_assignment",
          p_source_reference_id: null,
          p_due_at: null,
          p_reason: reason,
        };
      } else {
        rpcName = "assign_mentor_bulk";
        payload = {
          p_trainee_user_ids: traineeIds,
          p_mentor_user_id: mentorId,
          p_certification_id: null,
          p_reason: reason,
        };
      }

      const { data, error } = await supabase.rpc(rpcName as never, payload as never);
      if (error) throw error;
      setAssignResult(data as BulkResult);
      invalidateAfterChange();
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    if (selectedRows.length === 0) {
      toast({ title: "Select at least one row", variant: "destructive" });
      return;
    }
    if (unassignReason.trim().length < 10) {
      toast({ title: "Justification must be at least 10 characters", variant: "destructive" });
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
      invalidateAfterChange();
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setUnassignSubmitting(false);
    }
  };

  // Filter unassign rows
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

  const toggleRow = (id: string) => {
    setSelectedRows((rows) => (rows.includes(id) ? rows.filter((r) => r !== id) : [...rows, id]));
  };

  const renderAssignDialog = () => {
    let targetPicker: React.ReactNode = null;
    if (type === "cert_path") {
      const opts = certPathsQuery.data ?? [];
      targetPicker = (
        <div className="space-y-2">
          <label className="text-sm font-medium">Certification Path</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder={certPathsQuery.isLoading ? "Loading…" : "Choose a certification path"} /></SelectTrigger>
            <SelectContent>
              {opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    } else if (type === "curriculum") {
      const opts = curriculaQuery.data ?? [];
      targetPicker = (
        <div className="space-y-2">
          <label className="text-sm font-medium">Curriculum</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder={curriculaQuery.isLoading ? "Loading…" : "Choose a curriculum"} /></SelectTrigger>
            <SelectContent>
              {opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    } else if (type === "module") {
      const opts = modulesQuery.data ?? [];
      targetPicker = (
        <div className="space-y-2">
          <label className="text-sm font-medium">Module</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder={modulesQuery.isLoading ? "Loading…" : "Choose a module"} /></SelectTrigger>
            <SelectContent>
              {opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    } else {
      const opts = traineesListQuery.data?.trainees ?? [];
      targetPicker = (
        <div className="space-y-2">
          <label className="text-sm font-medium">Mentor</label>
          <Select value={mentorId} onValueChange={setMentorId}>
            <SelectTrigger><SelectValue placeholder={traineesListQuery.isLoading ? "Loading…" : "Choose a mentor"} /></SelectTrigger>
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
    }

    return (
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign {TYPE_LABEL[type]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Trainees</label>
            <TraineeMultiSelect selectedIds={traineeIds} onChange={setTraineeIds} />
          </div>
          {targetPicker}
          <div className="space-y-2">
            <label className="text-sm font-medium">Justification (min 10 chars)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being assigned?"
              rows={3}
            />
          </div>
          <ResultPanel result={assignResult} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAssignOpen(false); resetAssign(); }} disabled={submitting}>
            Close
          </Button>
          <Button onClick={handleAssign} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
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
      return <div className="rounded-md border p-6 text-sm text-muted-foreground text-center">No assignments found.</div>;
    }

    const allSelected = filteredRows.length > 0 && filteredRows.every((r: any) => selectedRows.includes(r.assignment_id));
    const toggleAll = () => {
      if (allSelected) {
        setSelectedRows((rows) => rows.filter((r) => !filteredRows.find((x: any) => x.assignment_id === r)));
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
              {type === "curriculum" && <><TableHead>Curriculum</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead></>}
              {type === "module" && <><TableHead>Module</TableHead><TableHead>Status</TableHead></>}
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
                  <div className="text-sm font-medium">{r.trainee_full_name || "(no name)"}</div>
                  {r.trainee_email && <div className="text-xs text-muted-foreground">{r.trainee_email}</div>}
                </TableCell>
                {type === "curriculum" && (
                  <>
                    <TableCell>{r.curriculum_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                  </>
                )}
                {type === "module" && (
                  <>
                    <TableCell>{r.module_name}</TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
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
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Learning Admin</h1>
        <p className="text-muted-foreground">Assign and unassign learning across trainees.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage learning</CardTitle>
          <CardDescription>Bulk operations for trainees and mentors.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="assignments">
            <TabsList>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>
            <TabsContent value="assignments" className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="space-y-2 sm:w-64">
                  <label className="text-sm font-medium">Assignment type</label>
                  <Select value={type} onValueChange={(v) => onTypeChange(v as AssignType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cert_path">Certification Path</SelectItem>
                      <SelectItem value="curriculum">Curriculum</SelectItem>
                      <SelectItem value="module">Module</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (!o) resetAssign(); }}>
                  <DialogTrigger asChild>
                    <Button>Assign {TYPE_LABEL[type]}</Button>
                  </DialogTrigger>
                  {renderAssignDialog()}
                </Dialog>
              </div>

              <section className="space-y-3">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
