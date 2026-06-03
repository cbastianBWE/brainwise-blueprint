import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProjectRecord = {
  id: string;
  customer_id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  billing_method: string;
  project_hourly_rate?: number | null;
  currency_code?: string | null;
  budget_hours?: number | null;
  budget_amount?: number | null;
};

type BillingMethod = "project_hours" | "task_hours" | "staff_hours" | "none";
type Status = "active" | "completed" | "inactive";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  project?: ProjectRecord | null;
};

type FormState = {
  name: string;
  billing_method: BillingMethod;
  project_hourly_rate: string;
  status: Status;
  description: string;
  start_date: string;
  end_date: string;
  budget_hours: string;
  budget_amount: string;
  currency_code: string;
};

const emptyState = (): FormState => ({
  name: "",
  billing_method: "none",
  project_hourly_rate: "",
  status: "active",
  description: "",
  start_date: "",
  end_date: "",
  budget_hours: "",
  budget_amount: "",
  currency_code: "USD",
});

const fromProject = (p: ProjectRecord): FormState => ({
  name: p.name ?? "",
  billing_method: (["project_hours", "task_hours", "staff_hours", "none"].includes(p.billing_method ?? "")
    ? p.billing_method
    : "none") as BillingMethod,
  project_hourly_rate: p.project_hourly_rate == null ? "" : String(p.project_hourly_rate),
  status: (["active", "completed", "inactive"].includes(p.status ?? "") ? p.status : "active") as Status,
  description: p.description ?? "",
  start_date: p.start_date ?? "",
  end_date: p.end_date ?? "",
  budget_hours: p.budget_hours == null ? "" : String(p.budget_hours),
  budget_amount: p.budget_amount == null ? "" : String(p.budget_amount),
  currency_code: p.currency_code ?? "USD",
});

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};
const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export default function ProjectFormDialog({ open, onOpenChange, customerId, project }: Props) {
  const isEdit = !!project;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(project ? fromProject(project) : emptyState());
      setError(null);
    }
  }, [open, project]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.billing_method) {
      setError("Billing method is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const common = {
      name: form.name.trim(),
      billing_method: form.billing_method,
      status: form.status,
      description: trimOrNull(form.description),
      start_date: trimOrNull(form.start_date),
      end_date: trimOrNull(form.end_date),
      budget_hours: numOrNull(form.budget_hours),
      budget_amount: numOrNull(form.budget_amount),
      currency_code: form.currency_code.trim() || "USD",
      fixed_cost_amount: null,
      project_hourly_rate:
        form.billing_method === "project_hours" ? numOrNull(form.project_hourly_rate) : null,
    };

    try {
      if (isEdit && project) {
        // customer_id intentionally omitted from update payload to preserve it.
        const { error } = await opsSupabase
          .from("projects")
          .update(common)
          .eq("id", project.id);
        if (error) throw error;
        toast.success("Project updated");
        queryClient.invalidateQueries({ queryKey: ["ops", "project", project.id] });
      } else {
        const { error } = await opsSupabase
          .from("projects")
          .insert({ ...common, customer_id: customerId });
        if (error) throw error;
        toast.success("Project created");
      }
      queryClient.invalidateQueries({ queryKey: ["ops", "customer-projects", customerId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update project details." : "Add a new project for this customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Billing method *</Label>
              <Select
                value={form.billing_method}
                onValueChange={(v) => set("billing_method", v as BillingMethod)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No hourly billing</SelectItem>
                  <SelectItem value="project_hours">Project hourly</SelectItem>
                  <SelectItem value="task_hours">Task hourly</SelectItem>
                  <SelectItem value="staff_hours">Staff hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {form.billing_method === "none" && (
                <>
                  <Label>Rate</Label>
                  <p className="text-sm text-muted-foreground">Fixed fees are added as charges on the project page.</p>
                </>
              )}
              {form.billing_method === "project_hours" && (
                <>
                  <Label htmlFor="project_hourly_rate">Project hourly rate</Label>
                  <Input
                    id="project_hourly_rate"
                    type="number"
                    step="0.01"
                    value={form.project_hourly_rate}
                    onChange={(e) => set("project_hourly_rate", e.target.value)}
                  />
                </>
              )}
              {form.billing_method === "task_hours" && (
                <>
                  <Label>Rate</Label>
                  <p className="text-sm text-muted-foreground">Rates are set per task.</p>
                </>
              )}
              {form.billing_method === "staff_hours" && (
                <>
                  <Label>Rate</Label>
                  <p className="text-sm text-muted-foreground">Rates are set per project member.</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency_code">Currency</Label>
              <Input
                id="currency_code"
                value={form.currency_code}
                onChange={(e) => set("currency_code", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_hours">Budget hours</Label>
              <Input
                id="budget_hours"
                type="number"
                step="0.01"
                value={form.budget_hours}
                onChange={(e) => set("budget_hours", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget_amount">Budget amount</Label>
              <Input
                id="budget_amount"
                type="number"
                step="0.01"
                value={form.budget_amount}
                onChange={(e) => set("budget_amount", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
