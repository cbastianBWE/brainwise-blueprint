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
import { Checkbox } from "@/components/ui/checkbox";

export type TaskRecord = {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  task_hourly_rate?: number | null;
  budget_hours?: number | null;
  is_billable?: boolean | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: TaskRecord | null;
};

type FormState = {
  name: string;
  task_hourly_rate: string;
  budget_hours: string;
  is_billable: boolean;
  description: string;
};

const emptyState = (): FormState => ({
  name: "",
  task_hourly_rate: "",
  budget_hours: "",
  is_billable: true,
  description: "",
});

const fromTask = (t: TaskRecord): FormState => ({
  name: t.name ?? "",
  task_hourly_rate: t.task_hourly_rate == null ? "" : String(t.task_hourly_rate),
  budget_hours: t.budget_hours == null ? "" : String(t.budget_hours),
  is_billable: t.is_billable ?? true,
  description: t.description ?? "",
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

export default function TaskFormDialog({ open, onOpenChange, projectId, task }: Props) {
  const isEdit = !!task;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(task ? fromTask(task) : emptyState());
      setError(null);
    }
  }, [open, task]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const common = {
      name: form.name.trim(),
      task_hourly_rate: numOrNull(form.task_hourly_rate),
      budget_hours: numOrNull(form.budget_hours),
      is_billable: form.is_billable,
      description: trimOrNull(form.description),
    };

    try {
      if (isEdit && task) {
        const { error } = await opsSupabase
          .from("project_tasks")
          .update(common)
          .eq("id", task.id);
        if (error) throw error;
        toast.success("Task updated");
      } else {
        const { error } = await opsSupabase
          .from("project_tasks")
          .insert({ ...common, project_id: projectId });
        if (error) throw error;
        toast.success("Task created");
      }
      queryClient.invalidateQueries({ queryKey: ["ops", "project-tasks", projectId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update task details." : "Add a new task to this project."}
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
              <Label htmlFor="task_hourly_rate">Task hourly rate</Label>
              <Input
                id="task_hourly_rate"
                type="number"
                step="0.01"
                value={form.task_hourly_rate}
                onChange={(e) => set("task_hourly_rate", e.target.value)}
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
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_billable"
              checked={form.is_billable}
              onCheckedChange={(v) => set("is_billable", v === true)}
            />
            <Label htmlFor="is_billable" className="cursor-pointer">Billable</Label>
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
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
