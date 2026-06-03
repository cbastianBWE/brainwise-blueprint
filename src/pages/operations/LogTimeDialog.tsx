import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function LogTimeDialog({ open, onOpenChange, projectId }: Props) {
  const queryClient = useQueryClient();

  const [date, setDate] = useState<string>(todayISO());
  const [taskId, setTaskId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [isBillable, setIsBillable] = useState<boolean>(true);
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasksQ = useQuery({
    queryKey: ["ops", "project-tasks-select", projectId],
    enabled: open && !!projectId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("project_tasks")
        .select("id, name")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const membersQ = useQuery({
    queryKey: ["ops", "ops-users"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("users")
        .select("id, full_name, email")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (open) {
      setDate(todayISO());
      setTaskId("");
      setMemberId("");
      setHours("");
      setIsBillable(true);
      setDescription("");
      setError(null);
    }
  }, [open]);

  // Resolve default member once members load
  useEffect(() => {
    if (!open || memberId || !membersQ.data || membersQ.data.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await opsSupabase.auth.getUser();
      if (cancelled) return;
      const uid = data.user?.id;
      const match = uid && membersQ.data!.find((m: any) => m.id === uid);
      setMemberId(match ? uid! : (membersQ.data![0] as any).id);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, membersQ.data, memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (!memberId) {
      setError("Team member is required.");
      return;
    }
    const hoursNum = Number(hours);
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      setError("Hours must be greater than zero.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await opsSupabase.from("time_entries").insert({
        project_id: projectId,
        project_task_id: taskId || null,
        user_id: memberId,
        date,
        hours: hoursNum,
        is_billable: isBillable,
        description: description.trim() || null,
      });
      if (error) throw error;
      toast.success("Time logged");
      queryClient.invalidateQueries({ queryKey: ["ops", "project-time", projectId] });
      queryClient.invalidateQueries({ queryKey: ["ops", "project-time-rollup", projectId] });
      queryClient.invalidateQueries({ queryKey: ["ops", "customer-time-rollup"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to log time");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log time</DialogTitle>
          <DialogDescription>Record time spent on this project.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Hours *</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Task</Label>
            <Select value={taskId || "__none"} onValueChange={(v) => setTaskId(v === "__none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No task</SelectItem>
                {(tasksQ.data ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Team member *</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {(membersQ.data ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_billable"
              checked={isBillable}
              onCheckedChange={(v) => setIsBillable(v === true)}
            />
            <Label htmlFor="is_billable" className="cursor-pointer">Billable</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Log time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
