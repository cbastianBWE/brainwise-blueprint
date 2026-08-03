import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import GenerateReportDialog from "@/components/reports/GenerateReportDialog";
import ManageReportAccessDialog from "@/components/reports/ManageReportAccessDialog";

interface ReportRow {
  report_id: string;
  kind: "team" | "paired";
  relationship_mode: string | null;
  member_count: number;
  narrative_status: string;
  computed_at: string | null;
  subjects: string;
  released_to_subjects: boolean;
}

interface OrderRow {
  order_id: string;
  order_type: "team" | "paired";
  relationship_mode: string | null;
  status: "pending_payment" | "paid" | "generating" | string;
  amount_cents: number;
  payer: "coach" | "client";
  client_email: string | null;
  subject_names: string;
  subject_count: number;
  release_now: boolean;
  report_label: string | null;
  created_at: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "complete":
      return <Badge>Ready</Badge>;
    case "generating":
      return <Badge variant="secondary">Generating</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "pending":
    default:
      return <Badge variant="outline">Not generated</Badge>;
  }
}

function orderStatusBadge(status: string) {
  switch (status) {
    case "pending_payment":
      return <Badge variant="outline">Awaiting payment</Badge>;
    case "paid":
      return <Badge variant="secondary">Paid, not generated</Badge>;
    case "generating":
      return <Badge variant="secondary">Generating</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function capitalize(s: string | null | undefined) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

function formatMoney(cents: number) {
  const d = (cents ?? 0) / 100;
  return d % 1 === 0 ? `$${d.toFixed(0)}` : `$${d.toFixed(2)}`;
}

function typeLabelFor(kind: "team" | "paired", mode: string | null) {
  return kind === "team" ? "Team" : `Paired${mode ? ` (${capitalize(mode)})` : ""}`;
}

export default function TeamPairedReports() {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageReport, setManageReport] = useState<{ reportId: string; kind: "team" | "paired"; title: string } | null>(null);
  const isSuperAdmin = profile?.account_type === "brainwise_super_admin";

  // Post-checkout state
  const [pollOrderId, setPollOrderId] = useState<string | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const allowedModes = useMemo<("work" | "personal" | "romantic")[]>(() => {
    const t = profile?.account_type;
    if (t === "coach" || t === "brainwise_super_admin") return ["work", "personal", "romantic"];
    return ["work"];
  }, [profile?.account_type]);

  const load = useCallback(async () => {
    setLoading(true);
    const [rep, ord] = await Promise.all([
      supabase.rpc("bw_list_my_reports"),
      (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)("bw_list_my_report_orders"),
    ]);
    if (!rep.error) setRows(((rep.data as ReportRow[]) ?? []));
    if (!ord.error) setOrders(((ord.data as OrderRow[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle Stripe redirect
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const orderId = searchParams.get("order");
    if (!checkout) return;

    if (checkout === "cancelled") {
      toast.info("Payment cancelled. Your order is saved and you can pay for it below.");
      navigate("/team-paired-reports", { replace: true });
      load();
      return;
    }

    if (checkout === "success" && orderId) {
      setPollOrderId(orderId);
      setPollAttempts(0);
      setPollTimedOut(false);
      navigate("/team-paired-reports", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Poll the post-checkout order
  useEffect(() => {
    if (!pollOrderId) return;
    let cancelled = false;
    let n = 0;
    const tick = async () => {
      if (cancelled) return;
      const { data } = await supabase
        .from("report_orders")
        .select("status, generated_profile_id, order_type")
        .eq("id", pollOrderId)
        .single();
      if (cancelled) return;
      if (data?.status === "generated" && data.generated_profile_id) {
        const href = data.order_type === "team"
          ? `/team-report/${data.generated_profile_id}`
          : `/paired-report/${data.generated_profile_id}`;
        setPollOrderId(null);
        navigate(href);
        return;
      }
      n += 1;
      setPollAttempts(n);
      if (n >= 30) {
        setPollTimedOut(true);
        load();
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollOrderId]);

  const [releasingId, setReleasingId] = useState<string | null>(null);
  const toggleRelease = async (r: ReportRow) => {
    setReleasingId(r.report_id);
    const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>)(
      "bw_set_report_release",
      { p_profile: r.report_id, p_kind: r.kind, p_released: !r.released_to_subjects },
    );
    setReleasingId(null);
    if (error) {
      toast.error(
        error.message?.includes("not_authorized")
          ? "You don't have permission to release this report."
          : "Couldn't update visibility. Please try again.",
      );
      return;
    }
    toast.success(r.released_to_subjects ? "Report hidden from participants." : "Report released to participants.");
    load();
  };

  const [orderBusyId, setOrderBusyId] = useState<string | null>(null);

  const doCheckout = async (order: OrderRow, resend = false) => {
    setOrderBusyId(order.order_id);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { mode: "report_order", order_id: order.order_id },
    });
    if (error) {
      setOrderBusyId(null);
      toast.error("Couldn't start checkout. Please try again.");
      return;
    }
    const res = data as { url?: string; payer: "coach" | "client" };
    if (res.payer === "coach" && res.url) {
      window.location.href = res.url;
      return;
    }
    setOrderBusyId(null);
    if (resend) toast.success("Payment link resent.");
  };

  const doGenerateFromOrder = async (order: OrderRow) => {
    setOrderBusyId(order.order_id);
    const fn = order.order_type === "team" ? "generate-team-profile" : "generate-paired-profile";
    const { data, error } = await supabase.functions.invoke(fn, {
      body: { order_id: order.order_id },
    });
    setOrderBusyId(null);
    if (error) {
      let body: { error?: string } | null = null;
      try {
        const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
        if (ctx?.json) body = await ctx.json();
      } catch { /* ignore */ }
      if (body?.error === "order_not_claimable") {
        load();
        return;
      }
      toast.error("Couldn't generate report. Please try again.");
      return;
    }
    const result = data as { team_profile_id?: string; paired_profile_id?: string };
    const id = order.order_type === "team" ? result.team_profile_id : result.paired_profile_id;
    if (id) {
      navigate(order.order_type === "team" ? `/team-report/${id}` : `/paired-report/${id}`);
    } else {
      load();
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team & Paired Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and open team and paired PTP reports.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate report
        </Button>
      </div>

      {/* Post-checkout building card */}
      {pollOrderId && (
        <Card>
          <CardContent className="py-4">
            {pollTimedOut ? (
              <p className="text-sm text-muted-foreground">
                Payment received, but the report hasn't finished building. Use Generate now below.
              </p>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Payment received. Building your report… ({pollAttempts}/30)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Outstanding orders */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const busy = orderBusyId === o.order_id;
                  return (
                    <TableRow key={o.order_id}>
                      <TableCell>{typeLabelFor(o.order_type, o.relationship_mode)}</TableCell>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-2">{o.subject_names}</span>
                      </TableCell>
                      <TableCell>{formatMoney(o.amount_cents)}</TableCell>
                      <TableCell>{orderStatusBadge(o.status)}</TableCell>
                      <TableCell className="text-right">
                        {o.status === "pending_payment" && o.payer === "coach" && (
                          <Button size="sm" disabled={busy} onClick={() => doCheckout(o)}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay now"}
                          </Button>
                        )}
                        {o.status === "pending_payment" && o.payer === "client" && (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              Link sent to {o.client_email ?? "participant"}
                            </span>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => doCheckout(o, true)}>
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend link"}
                            </Button>
                          </div>
                        )}
                        {o.status === "paid" && (
                          <Button size="sm" disabled={busy} onClick={() => doGenerateFromOrder(o)}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate now"}
                          </Button>
                        )}
                        {o.status === "generating" && (
                          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> In progress
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-sm text-muted-foreground text-center">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No reports yet.</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Generate your first report
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const typeLabel = typeLabelFor(r.kind, r.relationship_mode);
                  const href =
                    r.kind === "team"
                      ? `/team-report/${r.report_id}`
                      : `/paired-report/${r.report_id}`;
                  return (
                    <TableRow key={`${r.kind}-${r.report_id}`}>
                      <TableCell>{typeLabel}</TableCell>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-2">{r.subjects}</span>
                      </TableCell>
                      <TableCell>{statusBadge(r.narrative_status)}</TableCell>
                      <TableCell>{formatDate(r.computed_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={r.released_to_subjects ? "outline" : "secondary"}
                            size="sm"
                            disabled={releasingId === r.report_id}
                            onClick={() => toggleRelease(r)}
                          >
                            {releasingId === r.report_id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : r.released_to_subjects ? (
                              <Eye className="h-4 w-4 mr-1" />
                            ) : (
                              <EyeOff className="h-4 w-4 mr-1" />
                            )}
                            {r.released_to_subjects ? "Released" : "Held"}
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setManageReport({
                                  reportId: r.report_id,
                                  kind: r.kind,
                                  title: r.subjects,
                                })
                              }
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Manage access
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm">
                            <Link to={href}>Open</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GenerateReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allowedModes={allowedModes}
        onGenerated={load}
        isSuperAdmin={isSuperAdmin}
      />

      <ManageReportAccessDialog
        report={manageReport}
        open={manageReport !== null}
        onOpenChange={(o) => { if (!o) setManageReport(null); }}
      />
    </div>
  );
}
