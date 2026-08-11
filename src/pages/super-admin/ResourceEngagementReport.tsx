import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const EM_SPACE = "\u2003";

type SourceFilter = "all" | "library" | "ptp_intro_gate";

interface PerUserRow {
  resource_id: string;
  resource_title: string;
  content_type: string | null;
  user_id: string;
  user_email: string | null;
  account_type: string | null;
  organization_id: string | null;
  source: "library" | "ptp_intro_gate";
  open_count: number | null;
  status: "watched" | "skipped" | "in_progress" | null;
  max_percent: number | null;
  watched_seconds: number | null;
  completed_at: string | null;
  last_at: string;
}

interface AggregateRow {
  resource_id: string;
  resource_title: string;
  content_type: string | null;
  source: "library" | "ptp_intro_gate";
  distinct_users: number | null;
  total_opens: number | null;
  watched_users: number | null;
  skipped_users: number | null;
  avg_max_percent: number | null;
  last_at: string;
}

interface ReportResult {
  scope: "per_user" | "aggregate";
  row_count: number;
  truncated: boolean;
  filters: Record<string, unknown>;
  rows: PerUserRow[] | AggregateRow[];
}

type SortKey = "resource" | "user" | "last_at";

function sourceBadge(source: string) {
  if (source === "ptp_intro_gate") {
    return <Badge style={{ backgroundColor: COLORS.orange, color: "white" }}>PTP intro gate</Badge>;
  }
  return <Badge style={{ backgroundColor: COLORS.teal, color: "white" }}>Resources tab</Badge>;
}

function statusBadge(status: string | null) {
  if (status === "watched") {
    return <Badge style={{ backgroundColor: COLORS.green, color: "white" }}>watched</Badge>;
  }
  if (status === "skipped") {
    return <Badge style={{ backgroundColor: COLORS.gray, color: "white" }}>skipped</Badge>;
  }
  if (status === "in_progress") {
    return <Badge style={{ backgroundColor: COLORS.orange, color: "white" }}>in progress</Badge>;
  }
  return null;
}

function formatDateTime(d: string | null) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "";
  }
}

function formatSeconds(s: number | null | undefined) {
  const n = Number(s) || 0;
  if (n <= 0) return "";
  const m = Math.floor(n / 60);
  const sec = n % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export default function ResourceEngagementReport({ embedded = false }: { embedded?: boolean }) {
  const [source, setSource] = useState<SourceFilter>("all");
  const [resourceId, setResourceId] = useState<string>("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [limit, setLimit] = useState<string>("500");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("last_at");
  const [sortAsc, setSortAsc] = useState(false);

  const resourcesQuery = useQuery({
    queryKey: ["rer-resources"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("resources")
        .select("id, title, content_type")
        .eq("is_published", true)
        .is("archived_at", null)
        .order("title");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; content_type: string | null }>;
    },
  });

  const reportQuery = useQuery({
    queryKey: ["rer-report", source, resourceId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resource_engagement_report" as never, {
        p_resource_id: resourceId === "all" ? null : resourceId,
        p_user_id: null,
        p_source: source === "all" ? null : source,
        p_limit: Number(limit),
      } as never);
      if (error) throw error;
      return data as unknown as ReportResult;
    },
  });

  const scope = reportQuery.data?.scope ?? "per_user";
  const isAggregate = scope === "aggregate";

  const perUserRows = useMemo(() => {
    if (isAggregate) return [] as PerUserRow[];
    const rows = (reportQuery.data?.rows ?? []) as PerUserRow[];
    const q = emailFilter.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => (r.user_email ?? "").toLowerCase().includes(q))
      : rows;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "resource") {
        cmp = (a.resource_title ?? "").localeCompare(b.resource_title ?? "");
      } else if (sortKey === "user") {
        cmp = (a.user_email ?? "").localeCompare(b.user_email ?? "");
      } else {
        cmp = new Date(a.last_at).getTime() - new Date(b.last_at).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [reportQuery.data, isAggregate, emailFilter, sortKey, sortAsc]);

  const aggregateRows = useMemo(() => {
    if (!isAggregate) return [] as AggregateRow[];
    const rows = (reportQuery.data?.rows ?? []) as AggregateRow[];
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "resource") {
        cmp = (a.resource_title ?? "").localeCompare(b.resource_title ?? "");
      } else {
        cmp = new Date(a.last_at).getTime() - new Date(b.last_at).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [reportQuery.data, isAggregate, sortKey, sortAsc]);

  const activeRows: Array<PerUserRow | AggregateRow> = isAggregate ? aggregateRows : perUserRows;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = activeRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const tiles = useMemo(() => {
    const libRows = perUserRows.filter((r) => r.source === "library");
    const gateRows = perUserRows.filter((r) => r.source === "ptp_intro_gate");
    const libUsers = new Set(libRows.map((r) => r.user_id)).size;
    const libOpens = libRows.reduce((sum, r) => sum + (Number(r.open_count) || 0), 0);
    const gateUsers = new Set(gateRows.map((r) => r.user_id)).size;
    const watched = gateRows.filter((r) => r.status === "watched").length;
    const skipped = gateRows.filter((r) => r.status === "skipped").length;
    const denom = watched + skipped;
    const completion = denom > 0 ? Math.round((watched / denom) * 100) : null;
    const depth = median(
      gateRows
        .map((r) => (r.max_percent === null || r.max_percent === undefined ? null : Number(r.max_percent)))
        .filter((v): v is number => v !== null && !Number.isNaN(v)),
    );
    return { libUsers, libOpens, gateUsers, watched, skipped, completion, depth };
  }, [perUserRows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(key !== "last_at");
    }
    setPage(0);
  };

  const onExportCsv = () => {
    if (isAggregate) {
      const headers = [
        "Resource",
        "Source",
        "Distinct users",
        "Total opens",
        "Watched",
        "Skipped",
        "Avg depth",
        "Last activity",
      ];
      const body = aggregateRows.map((r) => [
        r.resource_title,
        r.source === "ptp_intro_gate" ? "PTP intro gate" : "Resources tab",
        r.distinct_users ?? "",
        r.total_opens ?? "",
        r.watched_users ?? "",
        r.skipped_users ?? "",
        r.avg_max_percent === null || r.avg_max_percent === undefined ? "" : `${r.avg_max_percent}%`,
        formatDateTime(r.last_at),
      ]);
      downloadCsv("resource-engagement.csv", rowsToCsv(headers, body));
      return;
    }
    const headers = [
      "Resource",
      "Source",
      "User",
      "Account type",
      "Opens",
      "Status",
      "Depth",
      "Watched",
      "Last activity",
    ];
    const body = perUserRows.map((r) => [
      r.resource_title,
      r.source === "ptp_intro_gate" ? "PTP intro gate" : "Resources tab",
      r.user_email ?? "",
      r.account_type ?? "",
      r.source === "library" ? (r.open_count ?? "") : "",
      r.source === "ptp_intro_gate" ? (r.status ?? "") : "",
      r.source === "ptp_intro_gate" && r.max_percent !== null && r.max_percent !== undefined
        ? `${r.max_percent}%`
        : "",
      formatSeconds(r.watched_seconds),
      formatDateTime(r.last_at),
    ]);
    downloadCsv("resource-engagement.csv", rowsToCsv(headers, body));
  };

  if (reportQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reportQuery.isError) {
    const raw = (reportQuery.error as Error)?.message ?? "Unknown error";
    const message = raw.includes("Permission denied")
      ? "You do not have access to this report."
      : raw;
    return (
      <div className={embedded ? "" : "container mx-auto p-6"}>
        <Card className="border-destructive">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-destructive">{message}</p>
            <Button variant="outline" onClick={() => reportQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const truncated = reportQuery.data?.truncated === true;

  return (
    <div className={embedded ? "space-y-6" : "container mx-auto p-6 space-y-6"}>
      <div className={embedded ? "flex justify-end gap-2" : "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"}>
        {!embedded && (
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: COLORS.navy }}>
            <BookOpen className="h-6 w-6" style={{ color: COLORS.teal }} />
            Resource Engagement
          </h1>
          <p className="text-sm text-muted-foreground">
            Voluntary opens from the Resources tab, and forced views inside the PTP intro gate. The two
            are counted separately.
          </p>
        </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => reportQuery.refetch()}
            disabled={reportQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={onExportCsv} style={{ backgroundColor: COLORS.teal }}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Source</label>
              <Select
                value={source}
                onValueChange={(v) => {
                  setSource(v as SourceFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="library">Resources tab</SelectItem>
                  <SelectItem value="ptp_intro_gate">PTP intro gate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Resource</label>
              <Select
                value={resourceId}
                onValueChange={(v) => {
                  setResourceId(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All resources</SelectItem>
                  {(resourcesQuery.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isAggregate && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">User email</label>
                <Input
                  value={emailFilter}
                  onChange={(e) => {
                    setEmailFilter(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Filter by email"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Row limit</label>
              <Select
                value={limit}
                onValueChange={(v) => {
                  setLimit(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="2500">2500</SelectItem>
                  <SelectItem value="5000">5000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {truncated && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
          Showing the first {reportQuery.data?.row_count} rows. Raise the row limit or narrow the
          filters to see the rest.
        </div>
      )}

      {!isAggregate && perUserRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Resources tab</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: COLORS.navy }}>
                {tiles.libUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                distinct users · {tiles.libOpens} opens
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">PTP intro gate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: COLORS.navy }}>
                {tiles.gateUsers}
              </div>
              <p className="text-xs text-muted-foreground">distinct users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Gate completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: COLORS.navy }}>
                {tiles.completion === null ? "—" : `${tiles.completion}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                {tiles.watched} watched · {tiles.skipped} skipped
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Median watch depth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: COLORS.navy }}>
                {tiles.depth === null ? "—" : `${Math.round(tiles.depth)}%`}
              </div>
              <p className="text-xs text-muted-foreground">gate rows only</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeRows.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No engagement recorded for these filters.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {isAggregate && (
              <p className="mb-3 text-sm text-muted-foreground">
                Aggregate view. Individual engagement is not shown.
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("resource")}>
                    Resource
                  </TableHead>
                  <TableHead>Source</TableHead>
                  {isAggregate ? (
                    <>
                      <TableHead>Distinct users</TableHead>
                      <TableHead>Total opens</TableHead>
                      <TableHead>Watched</TableHead>
                      <TableHead>Skipped</TableHead>
                      <TableHead>Avg depth</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("user")}>
                        User
                      </TableHead>
                      <TableHead>Account type</TableHead>
                      <TableHead>Opens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Depth</TableHead>
                      <TableHead>Watched</TableHead>
                    </>
                  )}
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("last_at")}>
                    Last activity
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAggregate
                  ? (pageRows as AggregateRow[]).map((r, i) => (
                      <TableRow key={`${r.resource_id}-${r.source}-${i}`}>
                        <TableCell>{r.resource_title}</TableCell>
                        <TableCell>{sourceBadge(r.source)}</TableCell>
                        <TableCell>{r.distinct_users ?? EM_SPACE}</TableCell>
                        <TableCell>{r.total_opens ?? EM_SPACE}</TableCell>
                        <TableCell>{r.watched_users ?? EM_SPACE}</TableCell>
                        <TableCell>{r.skipped_users ?? EM_SPACE}</TableCell>
                        <TableCell>
                          {r.avg_max_percent === null || r.avg_max_percent === undefined
                            ? EM_SPACE
                            : `${r.avg_max_percent}%`}
                        </TableCell>
                        <TableCell>{formatDateTime(r.last_at)}</TableCell>
                      </TableRow>
                    ))
                  : (pageRows as PerUserRow[]).map((r, i) => {
                      const isGate = r.source === "ptp_intro_gate";
                      return (
                        <TableRow key={`${r.resource_id}-${r.user_id}-${r.source}-${i}`}>
                          <TableCell>{r.resource_title}</TableCell>
                          <TableCell>{sourceBadge(r.source)}</TableCell>
                          <TableCell>{r.user_email ?? EM_SPACE}</TableCell>
                          <TableCell>{r.account_type ?? EM_SPACE}</TableCell>
                          <TableCell>{isGate ? EM_SPACE : (r.open_count ?? EM_SPACE)}</TableCell>
                          <TableCell>{isGate ? (statusBadge(r.status) ?? EM_SPACE) : EM_SPACE}</TableCell>
                          <TableCell>
                            {isGate && r.max_percent !== null && r.max_percent !== undefined
                              ? `${r.max_percent}%`
                              : EM_SPACE}
                          </TableCell>
                          <TableCell>{formatSeconds(r.watched_seconds) || EM_SPACE}</TableCell>
                          <TableCell>{formatDateTime(r.last_at)}</TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {safePage + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
