import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ChevronLeft, ChevronRight, History } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 50;
const EXPORT_CAP = 1000;
const RPC_PAGE_SIZE = 200;

type AccessRow = {
  audit_source: "super_admin" | "company_admin";
  event_id: string;
  action_type: string;
  action_category: string;
  created_at: string;
  actor_user_id: string;
  actor_email: string | null;
  actor_full_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  mode: string | null;
  reason: string | null;
  total_count: number;
};

const formatActionType = (t: string): string => {
  const spaced = t.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const SourceBadge = ({ source }: { source: AccessRow["audit_source"] }) => {
  if (source === "super_admin") return <Badge variant="destructive">Super Admin</Badge>;
  return <Badge variant="default">Org Admin</Badge>;
};

const ModeBadge = ({ mode }: { mode: string | null }) => {
  if (!mode) return <span className="text-muted-foreground">—</span>;
  if (mode === "observe") return <Badge variant="secondary">Observe</Badge>;
  if (mode === "act") return <Badge variant="outline">Act</Badge>;
  return <Badge variant="outline">{mode}</Badge>;
};

const truncate = (s: string, n = 80) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function AccessHistory() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-access-history", page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_access_history", {
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as AccessRow[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const totalCount = data?.[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showPagination = totalCount > PAGE_SIZE;

  const handleExportCsv = async () => {
    if (totalCount === 0) return;
    if (totalCount > EXPORT_CAP) {
      toast.warning(
        `Showing the most recent ${EXPORT_CAP} events. Total ${totalCount} events on record.`,
      );
    }
    const allRows: AccessRow[] = [];
    const maxPages = Math.ceil(Math.min(totalCount, EXPORT_CAP) / RPC_PAGE_SIZE);
    try {
      for (let p = 0; p < maxPages; p++) {
        const { data: pageRows, error: pageErr } = await supabase.rpc("my_access_history", {
          p_limit: RPC_PAGE_SIZE,
          p_offset: p * RPC_PAGE_SIZE,
        });
        if (pageErr) throw pageErr;
        if (pageRows) allRows.push(...(pageRows as AccessRow[]));
      }
    } catch (err: any) {
      toast.error("Could not generate CSV: " + (err?.message ?? "unknown error"));
      return;
    }

    const headers = [
      "When",
      "Action",
      "Category",
      "Actor email",
      "Actor name",
      "Source",
      "Mode",
      "Reason",
      "Organization",
    ];
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines = [
      headers.join(","),
      ...allRows.map((r) =>
        [
          new Date(r.created_at).toISOString(),
          r.action_type,
          r.action_category,
          r.actor_email,
          r.actor_full_name,
          r.audit_source,
          r.mode,
          r.reason,
          r.organization_name,
        ]
          .map(escape)
          .join(","),
      ),
    ];
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `access-history-${dateStamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${allRows.length} event${allRows.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-7 w-7" />
          Access History
        </h1>
        <p className="text-muted-foreground">
          A record of who has accessed your account information. This includes super admin reviews,
          organization admin access, and any impersonation sessions on your record.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading…"
                : totalCount === 0
                  ? "No events recorded."
                  : `${totalCount} event${totalCount === 1 ? "" : "s"} on record.`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={isLoading || totalCount === 0}
          >
            <Download />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-foreground">Could not load access history.</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : !isLoading && totalCount === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No access events yet. When a super admin or organization admin views your record,
                the activity will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      data!.map((r) => (
                        <TableRow key={r.event_id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(r.created_at)}
                          </TableCell>
                          <TableCell>
                            <div>{formatActionType(r.action_type)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatActionType(r.action_category)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{r.actor_full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.actor_email ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <SourceBadge source={r.audit_source} />
                          </TableCell>
                          <TableCell>
                            <ModeBadge mode={r.mode} />
                          </TableCell>
                          <TableCell>
                            {r.reason ? (
                              <span title={r.reason}>{truncate(r.reason)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {showPagination && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–
                    {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={(page + 1) * PAGE_SIZE >= totalCount || page + 1 >= totalPages}
                    >
                      Next
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
