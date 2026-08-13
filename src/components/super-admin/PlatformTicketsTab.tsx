import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

interface Ticket {
  id: string;
  ticket_type: string;
  severity: string;
  title: string;
  detail: Record<string, unknown> | null;
  subject_email: string | null;
  subject_user_id: string | null;
  subject_ref: string | null;
  status: string;
  is_backlog: boolean;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
  resolution_note: string | null;
}

interface TicketType {
  ticket_type: string;
  label: string;
  description: string | null;
}

interface ScanState {
  last_scan_at: string | null;
  last_scan_opened: number | null;
  last_scan_resolved: number | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#7a1f1f",
  high: "#F5741A",
  normal: "#006D77",
  low: "#6D6875",
};

const relTime = (iso: string | null) =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "Never run";

export default function PlatformTicketsTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [scanState, setScanState] = useState<ScanState | null>(null);

  const [statusFilter, setStatusFilter] = useState("open");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [actionTicket, setActionTicket] = useState<Ticket | null>(null);
  const [actionKind, setActionKind] = useState<"resolved" | "dismissed">("resolved");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, typesRes, scanRes] = await Promise.all([
        supabase
          .from("platform_tickets")
          .select(
            "id, ticket_type, severity, title, detail, subject_email, subject_user_id, subject_ref, status, is_backlog, created_at, acknowledged_at, resolved_at, resolution, resolution_note"
          )
          .order("created_at", { ascending: false }),
        supabase.from("platform_ticket_types").select("ticket_type, label, description"),
        supabase
          .from("platform_ticket_scan_state")
          .select("last_scan_at, last_scan_opened, last_scan_resolved")
          .maybeSingle(),
      ]);

      if (ticketsRes.error) throw ticketsRes.error;
      setTickets((ticketsRes.data ?? []) as unknown as Ticket[]);
      setTypes((typesRes.data ?? []) as TicketType[]);
      setScanState((scanRes.data ?? null) as ScanState | null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.rpc("platform_tickets_scan_now");
      if (error) throw error;
      const result = (data ?? {}) as { opened?: number; resolved?: number };
      toast.success(
        `Scan complete: ${result.opened ?? 0} opened, ${result.resolved ?? 0} resolved`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const typeLabel = (t: string) =>
    types.find((x) => x.ticket_type === t)?.label ?? t.replace(/_/g, " ");

  const counts = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open").length;
    const acknowledged = tickets.filter((t) => t.status === "acknowledged").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    const critHigh = tickets.filter(
      (t) => t.status === "open" && (t.severity === "critical" || t.severity === "high")
    ).length;
    return { open, acknowledged, resolved, critHigh };
  }, [tickets]);

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (severityFilter !== "all" && t.severity !== severityFilter) return false;
        if (typeFilter !== "all" && t.ticket_type !== typeFilter) return false;
        return true;
      }),
    [tickets, statusFilter, severityFilter, typeFilter]
  );

  const acknowledge = async (t: Ticket) => {
    const { error } = await supabase
      .from("platform_tickets")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id,
      })
      .eq("id", t.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ticket acknowledged");
    await load();
  };

  const submitAction = async () => {
    if (!actionTicket) return;
    setSaving(true);
    const { error } = await supabase
      .from("platform_tickets")
      .update({
        status: actionKind,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        resolution: actionKind === "resolved" ? "manual" : "dismissed",
        resolution_note: note || null,
      })
      .eq("id", actionTicket.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(actionKind === "resolved" ? "Ticket resolved" : "Ticket dismissed");
    setActionTicket(null);
    setNote("");
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const countCards = [
    { label: "Open", value: counts.open },
    { label: "Acknowledged", value: counts.acknowledged },
    { label: "Resolved", value: counts.resolved },
    { label: "Critical + High open", value: counts.critHigh },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 1. Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? "Running scan..." : "Run scan now"}
          </Button>
          <div className="text-sm text-muted-foreground">
            <span>Last scan: {relTime(scanState?.last_scan_at ?? null)}</span>
            {scanState?.last_scan_at && (
              <span>
                {" "}
                &middot; opened {scanState.last_scan_opened ?? 0}, resolved{" "}
                {scanState.last_scan_resolved ?? 0}
              </span>
            )}
          </div>
        </div>

        {/* 2. Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {countCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="py-4">
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3. Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.ticket_type} value={t.ticket_type}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-1">
              {statusFilter === "open" && counts.open === 0 ? (
                <>
                  <p className="text-sm text-foreground">
                    No open tickets. The platform is healthy.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last scan: {relTime(scanState?.last_scan_at ?? null)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tickets match these filters.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => {
              const detailEntries = Object.entries(t.detail ?? {});
              return (
                <Card key={t.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: SEVERITY_COLORS[t.severity] ?? SEVERITY_COLORS.low }}
                      >
                        {t.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {typeLabel(t.ticket_type)}
                      </span>
                      {t.is_backlog && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px]">Backlog</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Pre-existing when ticket tracking was switched on. No email was sent.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {format(new Date(t.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      {t.subject_email && (
                        <p className="text-xs text-muted-foreground">{t.subject_email}</p>
                      )}
                    </div>

                    {detailEntries.length > 0 && (
                      <div className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-4 gap-y-1 text-xs">
                        {detailEntries.map(([k, v]) => (
                          <div key={k} className="contents">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="text-foreground break-all">
                              {v === null || typeof v === "object"
                                ? JSON.stringify(v)
                                : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(t.status === "resolved" || t.status === "dismissed") && (
                      <p className="text-xs text-muted-foreground">
                        Resolved {relTime(t.resolved_at)} ({t.resolution ?? t.status})
                        {t.resolution_note ? `. ${t.resolution_note}` : ""}
                      </p>
                    )}

                    {(t.status === "open" || t.status === "acknowledged") && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {t.status === "open" && (
                          <Button variant="outline" size="sm" onClick={() => acknowledge(t)}>
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActionTicket(t);
                            setActionKind("resolved");
                            setNote("");
                          }}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActionTicket(t);
                            setActionKind("dismissed");
                            setNote("");
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Resolve / dismiss dialog */}
        <Dialog open={!!actionTicket} onOpenChange={(o) => !o && setActionTicket(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionKind === "resolved" ? "Resolve ticket" : "Dismiss ticket"}
              </DialogTitle>
              <DialogDescription>
                {actionKind === "resolved"
                  ? "If the underlying condition is still true, the next scan will reopen this ticket."
                  : "Dismiss suppresses this condition permanently. The scanner will not raise it again for this record, even if it stays true."}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              rows={4}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setActionTicket(null)}>
                Cancel
              </Button>
              <Button onClick={submitAction} disabled={saving}>
                {saving ? "Saving..." : actionKind === "resolved" ? "Resolve" : "Dismiss"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
