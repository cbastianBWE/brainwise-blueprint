import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2, RefreshCw, Download, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rowsToCsv, downloadCsv } from "@/lib/csvUtils";

const COLORS = {
  navy: "#021F36",
  teal: "#006D77",
  green: "#2D6A4F",
  gray: "#6D6875",
  orange: "#F5741A",
  red: "#b91c1c",
};

const PAGE_SIZE = 50;

type Tier = "all" | "cert_path" | "curriculum" | "module" | "content_item";
type Status = "all" | "completed" | "in_progress" | "not_started" | "certified" | "revoked";

const TIER_LABELS: Record<Exclude<Tier, "all">, string> = {
  cert_path: "Certification Path",
  curriculum: "Curriculum",
  module: "Module",
  content_item: "Content Item",
};

interface SummaryRow {
  tier: string;
  target_id: string | null;
  target_name: string;
  parent_path: string | null;
  total: number;
  done: number;
  in_progress: number;
  not_started: number;
  revoked: number;
  completion_rate: number;
}

interface DetailRow {
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  tier: string;
  target_id: string | null;
  target_name: string;
  parent_path: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  assigned_at: string | null;
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "certified") {
    return <Badge style={{ backgroundColor: COLORS.green, color: "white" }}>{s}</Badge>;
  }
  if (s === "in_progress") {
    return <Badge style={{ backgroundColor: COLORS.orange, color: "white" }}>in progress</Badge>;
  }
  if (s === "revoked") {
    return <Badge style={{ backgroundColor: COLORS.red, color: "white" }}>revoked</Badge>;
  }
  return <Badge style={{ backgroundColor: COLORS.gray, color: "white" }}>not started</Badge>;
}

function formatDate(d: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "-";
  }
}

export default function LearningReport() {
  const [tier, setTier] = useState<Tier>("all");
  const [targetKey, setTargetKey] = useState<string>("all"); // "all" or `${id}` or `name::${name}`
  const [userId, setUserId] = useState<string>("all");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkComplete, setBulkComplete] = useState(true);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Translate filter state to RPC params
  const rpcTier = tier === "all" ? null : tier;
  const rpcStatus = status === "all" ? null : status;
  const rpcUserIds = userId === "all" ? null : [userId];

  // Resolve selected target into target_id / target_name params
  const { rpcTargetId, rpcTargetName } = useMemo(() => {
    if (targetKey === "all" || tier === "all") {
      return { rpcTargetId: null as string | null, rpcTargetName: null as string | null };
    }
    if (targetKey.startsWith("name::")) {
      return { rpcTargetId: null, rpcTargetName: targetKey.slice(6) };
    }
    return { rpcTargetId: targetKey, rpcTargetName: null };
  }, [targetKey, tier]);

  // Users list
  const usersQuery = useQuery({
    queryKey: ["lr-users"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("users")
        .select("id,email,full_name")
        .is("deleted_at", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>;
    },
  });

  // Cert type map
  const certTypeQuery = useQuery({
    queryKey: ["lr-cert-type-map"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("certification_paths")
        .select("id,certification_type");
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of (data ?? []) as Array<{ id: string; certification_type: string }>) {
        map.set(row.id, row.certification_type);
      }
      return map;
    },
  });

  // Summary
  const summaryQuery = useQuery({
    queryKey: ["lr-summary", rpcTier, rpcTargetId, rpcTargetName, userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_learning_report_summary", {
        p_tier: rpcTier,
        p_target_id: rpcTargetId,
        p_target_name: rpcTargetName,
        p_user_ids: rpcUserIds,
      });
      if (error) throw error;
      return (data ?? []) as SummaryRow[];
    },
  });

  if (summaryQuery.error) {
    toast.error(`Failed to load summary: ${(summaryQuery.error as Error).message}`);
  }

  // Detail (paged)
  const detailQuery = useQuery({
    queryKey: ["lr-detail", rpcTier, rpcTargetId, rpcTargetName, userId, rpcStatus, page],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_learning_report_detail", {
        p_tier: rpcTier,
        p_target_id: rpcTargetId,
        p_target_name: rpcTargetName,
        p_user_ids: rpcUserIds,
        p_status: rpcStatus,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as DetailRow[];
    },
  });

  if (detailQuery.error) {
    toast.error(`Failed to load detail: ${(detailQuery.error as Error).message}`);
  }

  // Count (for pagination)
  const countQuery = useQuery({
    queryKey: ["lr-count", rpcTier, rpcTargetId, rpcTargetName, userId, rpcStatus],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_learning_report_detail", {
        p_tier: rpcTier,
        p_target_id: rpcTargetId,
        p_target_name: rpcTargetName,
        p_user_ids: rpcUserIds,
        p_status: rpcStatus,
        p_limit: null,
        p_offset: 0,
      });
      if (error) throw error;
      return (data ?? []).length as number;
    },
  });

  const totalCount = countQuery.data ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Tier targets for the Target select
  const targetOptions = useMemo(() => {
    if (tier === "all") return [];
    const rows = summaryQuery.data ?? [];
    return rows
      .filter((r) => r.tier === tier)
      .map((r) => ({
        value: r.target_id ?? `name::${r.target_name}`,
        label: r.target_name,
      }));
  }, [summaryQuery.data, tier]);

  // KPI cards aggregated per tier
  const tierAggregates = useMemo(() => {
    const rows = summaryQuery.data ?? [];
    const map = new Map<
      string,
      { total: number; done: number; in_progress: number; not_started: number; revoked: number }
    >();
    for (const r of rows) {
      const key = r.tier;
      const agg = map.get(key) ?? {
        total: 0,
        done: 0,
        in_progress: 0,
        not_started: 0,
        revoked: 0,
      };
      agg.total += Number(r.total) || 0;
      agg.done += Number(r.done) || 0;
      agg.in_progress += Number(r.in_progress) || 0;
      agg.not_started += Number(r.not_started) || 0;
      agg.revoked += Number(r.revoked) || 0;
      map.set(key, agg);
    }
    return Array.from(map.entries());
  }, [summaryQuery.data]);

  // Chart data
  const chartData = useMemo(() => {
    const rows = summaryQuery.data ?? [];
    if (rows.length > 30) return null;
    return rows.map((r) => ({
      name: r.target_name,
      done: Number(r.done) || 0,
      in_progress: Number(r.in_progress) || 0,
      not_started: Number(r.not_started) || 0,
      revoked: Number(r.revoked) || 0,
    }));
  }, [summaryQuery.data]);

  // Filtered user options
  const filteredUsers = useMemo(() => {
    const all = usersQuery.data ?? [];
    if (!userSearch.trim()) return all.slice(0, 100);
    const q = userSearch.toLowerCase();
    return all
      .filter(
        (u) =>
          (u.full_name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q),
      )
      .slice(0, 100);
  }, [usersQuery.data, userSearch]);

  // Bulk eligibility: single tier + single target chosen
  const bulkEligible =
    tier !== "all" &&
    targetKey !== "all" &&
    (tier === "cert_path" || tier === "curriculum" || tier === "module" || tier === "content_item");

  const detailRows = detailQuery.data ?? [];
  const pageRowKeys = detailRows.map((r, i) => `${r.user_id}-${i}`);
  const allOnPageSelected =
    pageRowKeys.length > 0 && pageRowKeys.every((k) => selectedRowKeys.has(k));

  const toggleRow = (k: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const togglePage = () => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageRowKeys.forEach((k) => next.delete(k));
      } else {
        pageRowKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const clearFilters = () => {
    setTier("all");
    setTargetKey("all");
    setUserId("all");
    setStatus("all");
    setPage(0);
    setSelectedRowKeys(new Set());
  };

  const refreshAll = () => {
    summaryQuery.refetch();
    detailQuery.refetch();
    countQuery.refetch();
  };

  const onExportCsv = async () => {
    setExporting(true);
    try {
      toast.message("Preparing CSV export…");
      const { data, error } = await (supabase as any).rpc("get_learning_report_detail", {
        p_tier: rpcTier,
        p_target_id: rpcTargetId,
        p_target_name: rpcTargetName,
        p_user_ids: rpcUserIds,
        p_status: rpcStatus,
        p_limit: null,
        p_offset: 0,
      });
      if (error) throw error;
      const rows = (data ?? []) as DetailRow[];
      const headers = [
        "user_email",
        "user_full_name",
        "tier",
        "target_name",
        "parent_path",
        "status",
        "started_at",
        "completed_at",
        "assigned_at",
      ];
      const body = rows.map((r) => [
        r.user_email ?? "",
        r.user_full_name ?? "",
        r.tier,
        r.target_name,
        r.parent_path ?? "",
        r.status,
        r.started_at ?? "",
        r.completed_at ?? "",
        r.assigned_at ?? "",
      ]);
      const csv = rowsToCsv(headers, body);
      downloadCsv("learning-report.csv", csv);
      toast.success(`Exported ${rows.length} rows`);
    } catch (e: any) {
      toast.error(`Export failed: ${e?.message ?? String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const selectedUserIds = useMemo(() => {
    const ids = new Set<string>();
    detailRows.forEach((r, i) => {
      if (selectedRowKeys.has(`${r.user_id}-${i}`)) ids.add(r.user_id);
    });
    return Array.from(ids);
  }, [detailRows, selectedRowKeys]);

  const openBulk = (complete: boolean) => {
    setBulkComplete(complete);
    setBulkReason("");
    setBulkOpen(true);
  };

  const submitBulk = async () => {
    if (bulkReason.trim().length < 10) return;
    if (!bulkEligible || selectedUserIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      let res: any;
      if (tier === "content_item") {
        ({ data: res } = await (supabase as any).rpc("set_content_item_completion_bulk", {
          p_user_ids: selectedUserIds,
          p_content_item_id: rpcTargetId,
          p_complete: bulkComplete,
          p_reason: bulkReason,
        }));
      } else if (tier === "module") {
        ({ data: res } = await (supabase as any).rpc("set_module_completion_bulk", {
          p_user_ids: selectedUserIds,
          p_module_id: rpcTargetId,
          p_complete: bulkComplete,
          p_reason: bulkReason,
        }));
      } else if (tier === "curriculum") {
        ({ data: res } = await (supabase as any).rpc("set_curriculum_completion_bulk", {
          p_user_ids: selectedUserIds,
          p_curriculum_id: rpcTargetId,
          p_complete: bulkComplete,
          p_reason: bulkReason,
        }));
      } else if (tier === "cert_path") {
        const certType =
          (rpcTargetId && certTypeQuery.data?.get(rpcTargetId)) || rpcTargetName || "";
        ({ data: res } = await (supabase as any).rpc("set_certification_completion_bulk", {
          p_user_ids: selectedUserIds,
          p_certification_type: certType,
          p_complete: bulkComplete,
          p_reason: bulkReason,
        }));
      }
      const succeeded = Number(res?.succeeded ?? 0);
      const failed = Number(res?.failed ?? 0);
      toast.success(`${succeeded} updated, ${failed} failed`);
      setSelectedRowKeys(new Set());
      setBulkOpen(false);
      refreshAll();
    } catch (e: any) {
      toast.error(`Bulk action failed: ${e?.message ?? String(e)}`);
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: COLORS.navy }}>
            <ClipboardList className="h-6 w-6" style={{ color: COLORS.teal }} />
            Learning Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Completion across cert paths, curricula, modules, and content items.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAll} disabled={summaryQuery.isFetching || detailQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 ${summaryQuery.isFetching || detailQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={onExportCsv} disabled={exporting} style={{ backgroundColor: COLORS.teal }}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tier</label>
              <Select
                value={tier}
                onValueChange={(v) => {
                  setTier(v as Tier);
                  setTargetKey("all");
                  setPage(0);
                  setSelectedRowKeys(new Set());
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tiers</SelectItem>
                  <SelectItem value="cert_path">Certification Paths</SelectItem>
                  <SelectItem value="curriculum">Curricula</SelectItem>
                  <SelectItem value="module">Modules</SelectItem>
                  <SelectItem value="content_item">Content Items</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target</label>
              <Select
                value={targetKey}
                onValueChange={(v) => {
                  setTargetKey(v);
                  setPage(0);
                  setSelectedRowKeys(new Set());
                }}
                disabled={tier === "all"}
              >
                <SelectTrigger><SelectValue placeholder="All targets" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All targets</SelectItem>
                  {targetOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">User</label>
              <Select
                value={userId}
                onValueChange={(v) => {
                  setUserId(v);
                  setPage(0);
                  setSelectedRowKeys(new Set());
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search users…"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectItem value="all">All users</SelectItem>
                  {filteredUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email || u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v as Status);
                  setPage(0);
                  setSelectedRowKeys(new Set());
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="certified">Certified</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryQuery.isLoading ? (
          <Card><CardContent className="pt-6"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>
        ) : tierAggregates.length === 0 ? (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground">No data.</CardContent></Card>
        ) : (
          tierAggregates.map(([t, agg]) => {
            const rate = agg.total ? Math.round((agg.done / agg.total) * 100) : 0;
            return (
              <Card key={t}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm" style={{ color: COLORS.navy }}>
                    {TIER_LABELS[t as Exclude<Tier, "all">] ?? t}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: COLORS.teal }}>
                    {agg.done} / {agg.total}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {rate}% completion
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Chart */}
      {chartData && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ color: COLORS.navy }}>Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: Math.max(260, chartData.length * 32 + 60) }}>
              <ResponsiveContainer>
                <BarChart layout="vertical" data={chartData} margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={180} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="done" stackId="a" fill={COLORS.green} name="Done" />
                  <Bar dataKey="in_progress" stackId="a" fill={COLORS.orange} name="In progress" />
                  <Bar dataKey="not_started" stackId="a" fill={COLORS.gray} name="Not started" />
                  <Bar dataKey="revoked" stackId="a" fill={COLORS.red} name="Revoked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle style={{ color: COLORS.navy }}>Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryQuery.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (summaryQuery.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No records match these filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Done</TableHead>
                  <TableHead className="text-right">In progress</TableHead>
                  <TableHead className="text-right">Not started</TableHead>
                  <TableHead className="text-right">Revoked</TableHead>
                  <TableHead className="text-right">Rate %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summaryQuery.data ?? []).map((r, i) => (
                  <TableRow
                    key={`${r.tier}-${r.target_id ?? r.target_name}-${i}`}
                    className="cursor-pointer"
                    onClick={() => {
                      setTier(r.tier as Tier);
                      setTargetKey(r.target_id ?? `name::${r.target_name}`);
                      setPage(0);
                      setSelectedRowKeys(new Set());
                    }}
                  >
                    <TableCell className="font-medium">{r.target_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.parent_path ?? "-"}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                    <TableCell className="text-right">{r.done}</TableCell>
                    <TableCell className="text-right">{r.in_progress}</TableCell>
                    <TableCell className="text-right">{r.not_started}</TableCell>
                    <TableCell className="text-right">{r.revoked}</TableCell>
                    <TableCell className="text-right">
                      {Math.round(Number(r.completion_rate ?? 0) * 100)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedRowKeys.size > 0 && (
        <div className="sticky bottom-4 z-10">
          <Card>
            <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm">
                {selectedRowKeys.size} selected ({selectedUserIds.length} unique user{selectedUserIds.length === 1 ? "" : "s"})
                {!bulkEligible && (
                  <span className="ml-2 text-muted-foreground">
                    Select rows within a single target to use bulk actions.
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRowKeys(new Set())}
                >
                  Clear
                </Button>
                <Button
                  disabled={!bulkEligible}
                  onClick={() => openBulk(true)}
                  style={{ backgroundColor: COLORS.green }}
                >
                  Mark complete
                </Button>
                <Button
                  disabled={!bulkEligible}
                  variant="destructive"
                  onClick={() => openBulk(false)}
                >
                  Mark incomplete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle style={{ color: COLORS.navy }}>Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {detailQuery.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : detailRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No records match these filters.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected}
                        onCheckedChange={togglePage}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailRows.map((r, i) => {
                    const key = `${r.user_id}-${i}`;
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRowKeys.has(key)}
                            onCheckedChange={() => toggleRow(key)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.user_full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.user_email}</div>
                        </TableCell>
                        <TableCell className="text-xs">{r.tier}</TableCell>
                        <TableCell>{r.target_name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.parent_path ?? "-"}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>{formatDate(r.completed_at)}</TableCell>
                        <TableCell>{formatDate(r.started_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages} · {totalCount} total
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk confirm dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkComplete ? "Mark complete" : "Mark incomplete"}
            </DialogTitle>
            <DialogDescription>
              You're about to {bulkComplete ? "mark complete" : "mark incomplete"} for{" "}
              {selectedUserIds.length} user{selectedUserIds.length === 1 ? "" : "s"} on this target.
              Please provide a reason (minimum 10 characters).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
            placeholder="Reason for this bulk override…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={submitBulk}
              disabled={bulkReason.trim().length < 10 || bulkSubmitting}
            >
              {bulkSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
