import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Pencil, Plus, FileText } from "lucide-react";
import { formatMoney } from "./_shared";
import ProjectFormDialog, { ProjectRecord } from "./ProjectFormDialog";
import TaskFormDialog, { TaskRecord } from "./TaskFormDialog";
import LogTimeDialog from "./LogTimeDialog";
import LogExpenseDialog from "./LogExpenseDialog";
import AddChargeDialog from "./AddChargeDialog";

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
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [logExpenseOpen, setLogExpenseOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genFrom, setGenFrom] = useState("");
  const [genTo, setGenTo] = useState("");

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
        .select("id, date, hours, is_billable, is_invoiced, description, project_tasks(name), users!time_entries_user_id_fkey(full_name, email)")
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
        .select("id, date, amount, is_billable, is_invoiced, vendor_name, is_mileage, currency_code, expense_categories(name)")
        .eq("project_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
          <Button variant="outline" size="sm" disabled={!p} onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksQ.data.map((t: any) => (
                  <TableRow
                    key={t.id}
                    onClick={() => { setEditingTask(t as TaskRecord); setTaskOpen(true); }}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right">
                      {t.task_hourly_rate == null ? "—" : formatMoney(t.task_hourly_rate, p?.currency_code)}
                    </TableCell>
                    <TableCell className="text-right">{t.budget_hours ?? "—"}</TableCell>
                    <TableCell>{t.is_billable ? "Yes" : "No"}</TableCell>
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
          <Button size="sm" disabled={!p} onClick={() => setLogTimeOpen(true)}>
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
          <Button size="sm" disabled={!p} onClick={() => setLogExpenseOpen(true)}>
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
        <LogTimeDialog open={logTimeOpen} onOpenChange={setLogTimeOpen} projectId={id} />
      )}
      {id && (
        <LogExpenseDialog
          open={logExpenseOpen}
          onOpenChange={setLogExpenseOpen}
          projectId={id}
          customerId={p?.customer_id}
        />
      )}
    </div>
  );
}
