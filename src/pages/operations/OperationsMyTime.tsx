import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DurationPicker from "./DurationPicker";

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const off = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - off);
  x.setHours(0, 0, 0, 0);
  return x;
};

const fmtHM = (dec: number) => {
  if (!(dec > 0)) return "·";
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};

type ExtraRow = { project_id: string; project_task_id: string | null };

export default function OperationsMyTime() {
  const queryClient = useQueryClient();
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMon(new Date()));
  const [extraRows, setExtraRows] = useState<ExtraRow[]>([]);
  const [addProjectId, setAddProjectId] = useState<string>("");
  const [addTaskId, setAddTaskId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await opsSupabase.auth.getUser();
      setCurrentUid(data.user?.id ?? null);
    })();
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const daysISO = days.map(toISODate);

  const weekEntriesQ = useQuery({
    queryKey: ["ops", "my-time", daysISO[0], currentUid],
    enabled: !!currentUid,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("time_entries")
        .select("id, date, hours, project_id, project_task_id, timer_running")
        .eq("user_id", currentUid!)
        .gte("date", daysISO[0])
        .lte("date", daysISO[6]);
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectsQ = useQuery({
    queryKey: ["ops", "my-time-projects"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tasksQ = useQuery({
    queryKey: ["ops", "my-time-tasks"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("project_tasks")
        .select("id, name, project_id")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectName = (pid: string) =>
    (projectsQ.data as any[] | undefined)?.find((p) => p.id === pid)?.name ?? pid ?? "—";
  const taskName = (tid: string | null) => {
    if (!tid) return "Untasked";
    return (tasksQ.data as any[] | undefined)?.find((t) => t.id === tid)?.name ?? "—";
  };

  const cellMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ((weekEntriesQ.data ?? []) as any[])) {
      if (r.timer_running) continue;
      const k = `${r.project_id}|${r.project_task_id ?? "none"}|${r.date}`;
      m.set(k, (m.get(k) ?? 0) + Number(r.hours || 0));
    }
    return m;
  }, [weekEntriesQ.data]);

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: ExtraRow[] = [];
    const push = (r: ExtraRow) => {
      const k = `${r.project_id}|${r.project_task_id ?? "none"}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push(r);
    };
    for (const r of ((weekEntriesQ.data ?? []) as any[])) {
      if (r.timer_running) continue;
      push({ project_id: r.project_id, project_task_id: r.project_task_id ?? null });
    }
    for (const r of extraRows) push(r);
    out.sort((a, b) => {
      const pa = projectName(a.project_id);
      const pb = projectName(b.project_id);
      if (pa !== pb) return pa.localeCompare(pb);
      return taskName(a.project_task_id).localeCompare(taskName(b.project_task_id));
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEntriesQ.data, extraRows, projectsQ.data, tasksQ.data]);

  const colTotals = daysISO.map((iso) =>
    rows.reduce(
      (s, r) => s + (cellMap.get(`${r.project_id}|${r.project_task_id ?? "none"}|${iso}`) ?? 0),
      0,
    ),
  );
  const grandTotal = colTotals.reduce((s, n) => s + n, 0);

  const addTime = async (
    projectId: string,
    taskId: string | null,
    dateISO: string,
    hoursStr: string,
  ) => {
    const n = Number(hoursStr);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Pick a duration");
      return;
    }
    const { error } = await opsSupabase
      .from("time_entries")
      .insert({ project_id: projectId, project_task_id: taskId, date: dateISO, hours: n } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Time added");
    queryClient.invalidateQueries({ queryKey: ["ops", "my-time"] });
    queryClient.invalidateQueries({ queryKey: ["ops", "project-time"] });
    queryClient.invalidateQueries({ queryKey: ["ops", "project-time-rollup"] });
    queryClient.invalidateQueries({ queryKey: ["ops", "customer-time-rollup"] });
    queryClient.invalidateQueries({ queryKey: ["ops", "project-financials"] });
  };

  const tasksForProject = ((tasksQ.data ?? []) as any[]).filter(
    (t) => t.project_id === addProjectId,
  );

  const handleAddRow = () => {
    if (!addProjectId) {
      toast.error("Pick a project");
      return;
    }
    const taskId = addTaskId || null;
    setExtraRows((prev) => {
      const k = `${addProjectId}|${taskId ?? "none"}`;
      if (prev.some((r) => `${r.project_id}|${r.project_task_id ?? "none"}` === k)) return prev;
      return [...prev, { project_id: addProjectId, project_task_id: taskId }];
    });
    setAddProjectId("");
    setAddTaskId("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Time</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Week</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d);
              }}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {days[0].toLocaleDateString()} – {days[6].toLocaleDateString()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(d);
              }}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeekMon(new Date()))}>
              This week
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {weekEntriesQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No time yet this week. Add a row below to start logging.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project / Task</TableHead>
                  {days.map((d, i) => (
                    <TableHead key={daysISO[i]} className="text-center">
                      {d.toLocaleDateString(undefined, { weekday: "short" })} {d.getDate()}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const cells = daysISO.map(
                    (iso) =>
                      cellMap.get(`${row.project_id}|${row.project_task_id ?? "none"}|${iso}`) ?? 0,
                  );
                  const rowTotal = cells.reduce((s, n) => s + n, 0);
                  return (
                    <TableRow key={`${row.project_id}|${row.project_task_id ?? "none"}`}>
                      <TableCell className="font-medium">
                        {projectName(row.project_id)} — {taskName(row.project_task_id)}
                      </TableCell>
                      {cells.map((sum, i) => (
                        <TableCell key={daysISO[i]} className="p-1 text-center">
                          <GridCell
                            display={fmtHM(sum)}
                            onAdd={(h) =>
                              addTime(row.project_id, row.project_task_id, daysISO[i], h)
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums">{fmtHM(rowTotal)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  {colTotals.map((n, i) => (
                    <TableCell key={daysISO[i]} className="text-center font-semibold tabular-nums">
                      {fmtHM(n)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmtHM(grandTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          <div className="flex flex-col md:flex-row gap-2 md:items-end pt-2 border-t">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Project</label>
              <Select
                value={addProjectId}
                onValueChange={(v) => {
                  setAddProjectId(v);
                  setAddTaskId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {((projectsQ.data ?? []) as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Task</label>
              <Select
                value={addTaskId || "__none"}
                onValueChange={(v) => setAddTaskId(v === "__none" ? "" : v)}
                disabled={!addProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Untasked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Untasked</SelectItem>
                  {tasksForProject.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddRow} disabled={!addProjectId}>
              Add row
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GridCell({
  display,
  onAdd,
}: {
  display: string;
  onAdd: (hoursStr: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setHours("");
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full font-mono tabular-nums">
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-3">
        <DurationPicker valueHours={hours} onChange={setHours} />
        <Button
          size="sm"
          className="w-full"
          disabled={!(Number(hours) > 0) || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onAdd(hours);
              setHours("");
              setOpen(false);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
