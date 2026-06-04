import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, FileText, Trash2 } from "lucide-react";
import { formatMoney } from "./_shared";
import ProjectFormDialog, { ProjectRecord } from "./ProjectFormDialog";
import TaskFormDialog, { TaskRecord } from "./TaskFormDialog";
import LogTimeDialog, { TimeEntryRecord } from "./LogTimeDialog";
import LogExpenseDialog, { ExpenseRecord } from "./LogExpenseDialog";
import AddChargeDialog from "./AddChargeDialog";
import TeamMemberDialog, { TeamMemberDialogMember } from "./TeamMemberDialog";

const BILLING_LABELS: Record<string, string> = {
  fixed: "Fixed cost",
  project_hours: "Project hourly",
  task_hours: "Task hourly",
  staff_hours: "Staff hourly",
  none: "No hourly billing",
};

export default function OperationsProjectDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [editingTime, setEditingTime] = useState<TimeEntryRecord | null>(null);
  const [logExpenseOpen, setLogExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genFrom, setGenFrom] = useState("");
  const [genTo, setGenTo] = useState("");
  const [genDetail, setGenDetail] = useState<"itemized" | "summary">("itemized");
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamMode, setTeamMode] = useState<"add" | "edit">("add");
  const [editingMember, setEditingMember] = useState<(TeamMemberDialogMember & { display_name: string }) | null>(null);

  const projectQ = useQuery({
    queryKey: ["ops", "project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const p = projectQ.data as any;

  const customerQ = useQuery({
    queryKey: ["ops", "project-customer", p?.customer_id],
    enabled: !!p?.customer_id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("display_name")
        .eq("id", p.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tasksQ = useQuery({
    queryKey: ["ops", "project-tasks", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("project_tasks")
        .select("id, name, task_hourly_rate, budget_hours, is_billable, description, project_id")
        .eq("project_id", id)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const timeRollupQ = useQuery({
    queryKey: ["ops", "project-time-rollup", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("project_time_rollup")
        .select("total_hours, billable_hours, unbilled_billable_hours")
        .eq("project_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const timeEntriesQ = useQuery({
    queryKey: ["ops", "project-time", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("time_entries")
        .select("id, date, hours, is_billable, is_invoiced, description, user_id, project_task_id, project_tasks(name), users!time_entries_user_id_fkey(full_name, email)")
        .eq("project_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const expenseRollupQ = useQuery({
    queryKey: ["ops", "project-expense-rollup", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("unbilled_expenses" as any)
        .select("unbilled_amount, expense_count")
        .eq("project_id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const expensesQ = useQuery({
    queryKey: ["ops", "project-expenses", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("expenses")
        .select("id, date, amount, is_billable, is_invoiced, vendor_name, is_mileage, currency_code, expense_category_id, markup_percentage, miles_driven, per_mile_rate, receipt_storage_path, notes, expense_categories(name)")
        .eq("project_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const chargesQ = useQuery({
    queryKey: ["ops", "project-charges", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("project_charges")
        .select("id, date, description, amount, is_billable, is_invoiced, currency_code")
        .eq("project_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const chargesUnbilledTotal = (chargesQ.data ?? []).reduce(
    (sum: number, r: any) => sum + (r.is_billable && !r.is_invoiced ? Number(r.amount) || 0 : 0),
    0,
  );
  const chargesCount = chargesQ.data?.length ?? 0;

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc("ops_create_invoice_from_project", {
        p_project: id,
        p_date_from: genFrom || null,
        p_date_to: genTo || null,
        p_detail: genDetail,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Draft invoice created");
        navigate(`/operations/invoices/${data}`);
      }
    } finally {
      setGenerating(false);
      setGenOpen(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const { error } = await opsSupabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["ops", "project-tasks", id] });
    } catch (err: any) {
      const msg = err?.message ?? "Failed to delete task";
      if (err?.code === "23503" || /foreign key/i.test(msg)) {
        toast.error("Can't delete a task that has time logged against it. Remove or reassign its time entries first.");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!window.confirm("Delete this time entry?")) return;
    try {
      const { error } = await opsSupabase.from("time_entries").delete().eq("id", entryId);
      if (error) throw error;
      toast.success("Time entry deleted");
      queryClient.invalidateQueries({ queryKey: ["ops", "project-time", id] });
      queryClient.invalidateQueries({ queryKey: ["ops", "project-time-rollup", id] });
      queryClient.invalidateQueries({ queryKey: ["ops", "customer-time-rollup"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete time entry");
    }
  };

  const handleDeleteExpense = async (expenseId: string, receiptPath: string | null) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      if (receiptPath) {
        try {
          await opsSupabase.storage.from("operations-receipts").remove([receiptPath]);
        } catch {
          /* best-effort */
        }
      }
      const { error } = await opsSupabase.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["ops", "project-expenses", id] });
      queryClient.invalidateQueries({ queryKey: ["ops", "project-expense-rollup", id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete expense");
    }
  };

  const billingLabel = p?.billing_method ? BILLING_LABELS[p.billing_method] ?? p.billing_method : "—";


  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>{p?.name ?? (projectQ.isLoading ? "Loading…" : "Project")}</CardTitle>
            {p?.customer_id && (
              <p className="text-sm text-muted-foreground">
                Customer:{" "}
                <Link to={`/operations/customers/${p.customer_id}`} className="underline">
                  {customerQ.data?.display_name ?? "View customer"}
                </Link>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!p} onClick={() => setGenOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Generate invoice
            </Button>
            <Button variant="outline" size="sm" disabled={!p} onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projectQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !p ? (
            <p className="text-destructive text-sm">Project not found.</p>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{p.status ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Billing method</dt><dd>{billingLabel}</dd></div>
              {p.billing_method === "fixed" && (
                <div>
                  <dt className="text-muted-foreground">Fixed cost</dt>
                  <dd>{p.fixed_cost_amount == null ? "—" : formatMoney(p.fixed_cost_amount, p.currency_code)}</dd>
                </div>
              )}
              {p.billing_method === "project_hours" && (
                <div>
                  <dt className="text-muted-foreground">Project hourly rate</dt>
                  <dd>{p.project_hourly_rate == null ? "—" : formatMoney(p.project_hourly_rate, p.currency_code)}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Tasks</CardTitle>
          <Button size="sm" disabled={!p} onClick={() => { setEditingTask(null); setTaskOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        </CardHeader>
        <CardContent>
          {tasksQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !tasksQ.data || tasksQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Budget hours</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksQ.data.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right">
                      {t.task_hourly_rate == null ? "—" : formatMoney(t.task_hourly_rate, p?.currency_code)}
                    </TableCell>
                    <TableCell className="text-right">{t.budget_hours ?? "—"}</TableCell>
                    <TableCell>{t.is_billable ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingTask(t as TaskRecord); setTaskOpen(true); }}
                          aria-label="Edit task"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(t.id)}
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Time</CardTitle>
          <Button size="sm" disabled={!p} onClick={() => { setEditingTime(null); setLogTimeOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Log time
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Total {timeRollupQ.data?.total_hours ?? 0} h · Billable {timeRollupQ.data?.billable_hours ?? 0} h · Unbilled {timeRollupQ.data?.unbilled_billable_hours ?? 0} h
          </p>
          {timeEntriesQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !timeEntriesQ.data || timeEntriesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No time logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntriesQ.data.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.project_tasks?.name ?? "—"}</TableCell>
                    <TableCell>{row.users?.full_name ?? row.users?.email ?? "—"}</TableCell>
                    <TableCell className="text-right">{row.hours}</TableCell>
                    <TableCell>{row.is_billable ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.is_invoiced ? "Invoiced" : "Unbilled"}</TableCell>
                    <TableCell className="text-right">
                      {!row.is_invoiced && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTime({
                                id: row.id,
                                date: row.date,
                                project_task_id: row.project_task_id ?? null,
                                user_id: row.user_id,
                                hours: row.hours,
                                is_billable: row.is_billable,
                                description: row.description ?? null,
                              });
                              setLogTimeOpen(true);
                            }}
                            aria-label="Edit time entry"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTimeEntry(row.id)}
                            aria-label="Delete time entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Expenses</CardTitle>
          <Button size="sm" disabled={!p} onClick={() => { setEditingExpense(null); setLogExpenseOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Log expense
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unbilled {formatMoney(expenseRollupQ.data?.unbilled_amount ?? 0, p?.currency_code)} across {expenseRollupQ.data?.expense_count ?? 0} expense(s).
          </p>
          {expensesQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !expensesQ.data || expensesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No expenses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesQ.data.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.expense_categories?.name ?? "—"}</TableCell>
                    <TableCell>{row.vendor_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.amount, row.currency_code)}</TableCell>
                    <TableCell>{row.is_billable ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.is_invoiced ? "Invoiced" : "Unbilled"}</TableCell>
                    <TableCell className="text-right">
                      {!row.is_invoiced && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingExpense(row as ExpenseRecord); setLogExpenseOpen(true); }}
                            aria-label="Edit expense"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(row.id, row.receipt_storage_path ?? null)}
                            aria-label="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Charges</CardTitle>
          <Button size="sm" disabled={!p} onClick={() => setChargeOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add charge
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unbilled {formatMoney(chargesUnbilledTotal, p?.currency_code)} across {chargesCount} charge(s).
          </p>
          {chargesQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !chargesQ.data || chargesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No charges yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargesQ.data.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.amount, row.currency_code)}</TableCell>
                    <TableCell>{row.is_billable ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.is_invoiced ? "Invoiced" : "Unbilled"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {p && (
        <ProjectFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          customerId={p.customer_id}
          project={p as ProjectRecord}
        />
      )}
      {id && (
        <TaskFormDialog
          open={taskOpen}
          onOpenChange={(o) => { setTaskOpen(o); if (!o) setEditingTask(null); }}
          projectId={id}
          task={editingTask}
        />
      )}
      {id && (
        <LogTimeDialog
          open={logTimeOpen}
          onOpenChange={(o) => { setLogTimeOpen(o); if (!o) setEditingTime(null); }}
          projectId={id}
          entry={editingTime}
        />
      )}
      {id && (
        <LogExpenseDialog
          open={logExpenseOpen}
          onOpenChange={(o) => { setLogExpenseOpen(o); if (!o) setEditingExpense(null); }}
          projectId={id}
          customerId={p?.customer_id}
          expense={editingExpense}
        />
      )}
      {id && (
        <AddChargeDialog
          open={chargeOpen}
          onOpenChange={setChargeOpen}
          projectId={id}
          customerId={p?.customer_id}
        />
      )}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate invoice</DialogTitle>
            <DialogDescription>
              Create a draft invoice from this project's unbilled time, expenses, and charges. Optionally limit by date range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gen_from">From</Label>
              <Input id="gen_from" type="date" value={genFrom} onChange={(e) => setGenFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen_to">To</Label>
              <Input id="gen_to" type="date" value={genTo} onChange={(e) => setGenTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 py-2">
            <Label htmlFor="gen_detail">Detail level</Label>
            <Select value={genDetail} onValueChange={(v) => setGenDetail(v as "itemized" | "summary")}>
              <SelectTrigger id="gen_detail">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="itemized">Itemized</SelectItem>
                <SelectItem value="summary">Summary by project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>
              Cancel
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={generating || !id}>
              {generating ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
