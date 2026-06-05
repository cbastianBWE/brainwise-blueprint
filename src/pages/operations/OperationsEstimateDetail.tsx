import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, formatMoney, formatDate } from "./_shared";

type ConfirmAction = "mark_accepted" | "mark_declined" | "mark_expired";

const SENDABLE_BLOCKED = new Set(["invoiced", "declined", "expired"]);

export default function OperationsEstimateDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [acting, setActing] = useState(false);
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projName, setProjName] = useState("");
  const [projBilling, setProjBilling] = useState<"none" | "project_hours" | "task_hours" | "staff_hours">("none");

  const estimateQ = useQuery({
    queryKey: ["ops", "estimate", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("estimates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const est = estimateQ.data as any;

  const customerQ = useQuery({
    queryKey: ["ops", "estimate-customer", est?.customer_id],
    enabled: !!est?.customer_id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("display_name, email, billing_address")
        .eq("id", est.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const linesQ = useQuery({
    queryKey: ["ops", "estimate-lines", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("document_lines")
        .select("description, quantity, unit_price, line_total, line_type, sort_order")
        .eq("document_type", "estimate")
        .eq("document_id", id)
        .neq("line_type", "header")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  function invalidateEstimate() {
    qc.invalidateQueries({ queryKey: ["ops", "estimate", id] });
    qc.invalidateQueries({ queryKey: ["ops", "estimates", "list"] });
  }

  async function handleMarkSent() {
    const { error } = await supabase.rpc("ops_set_estimate_status" as any, { p_id: id, p_action: "mark_sent" });
    if (error) { toast.error(error.message ?? "Action failed"); return; }
    toast.success("Estimate marked as sent.");
    invalidateEstimate();
  }

  async function handleSend() {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ops-estimate-send", { body: { estimate_id: id } });
      if (error || (data as any)?.error) {
        const ctxMsg = error ? await readFunctionsErrorMessage(error) : null;
        toast.error(ctxMsg ?? (data as any)?.error ?? error?.message ?? "Email failed");
        return;
      }
      toast.success("Estimate emailed to the customer.");
      invalidateEstimate();
    } finally {
      setSending(false);
    }
  }

  async function handleConvert() {
    setConverting(true);
    try {
      const { data, error } = await supabase.rpc("ops_convert_estimate_to_invoice" as any, { p_estimate: id });
      if (error) { toast.error(error.message ?? "Conversion failed"); return; }
      toast.success("Estimate converted to invoice.");
      invalidateEstimate();
      navigate(`/operations/invoices/${data as unknown as string}`);
    } finally {
      setConverting(false);
    }
  }

  async function handleConvertRetainer() {
    setConverting(true);
    try {
      const { data, error } = await supabase.rpc("ops_convert_estimate_to_retainer" as any, { p_estimate: id });
      if (error) { toast.error(error.message ?? "Conversion failed"); return; }
      toast.success("Estimate converted to retainer.");
      invalidateEstimate();
      navigate(`/operations/retainers/${data as unknown as string}`);
    } finally { setConverting(false); }
  }

  function openProjectConvert() {
    setProjName(`Project - ${est.estimate_number}`);
    setProjBilling("none");
    setProjectDialogOpen(true);
  }

  async function handleConvertProject() {
    setConverting(true);
    try {
      const { data, error } = await supabase.rpc("ops_convert_estimate_to_project" as any, {
        p_estimate: id,
        p_name: projName.trim() || null,
        p_billing_method: projBilling,
      });
      if (error) { toast.error(error.message ?? "Conversion failed"); return; }
      toast.success("Estimate converted to project.");
      setProjectDialogOpen(false);
      invalidateEstimate();
      navigate(`/operations/projects/${data as unknown as string}`);
    } finally { setConverting(false); }
  }

  async function runConfirmed() {
    if (!confirm) return;
    setActing(true);
    try {
      const { error } = await supabase.rpc("ops_set_estimate_status" as any, { p_id: id, p_action: confirm });
      if (error) { toast.error(error.message ?? "Action failed"); return; }
      if (confirm === "mark_accepted") toast.success("Estimate marked as accepted.");
      else if (confirm === "mark_declined") toast.success("Estimate marked as declined.");
      else if (confirm === "mark_expired") toast.success("Estimate marked as expired.");
      invalidateEstimate();
      setConfirm(null);
    } finally {
      setActing(false);
    }
  }

  if (estimateQ.isLoading) {
    return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;
  }
  if (!est) {
    return <div className="p-6 text-destructive text-sm">Estimate not found.</div>;
  }

  const status = (est.status ?? "").toLowerCase();
  const convertedInvoiceId = (est.converted_invoice_id as string | null) ?? null;
  const convertedProjectId = (est.converted_project_id as string | null) ?? null;
  const convertedRetainerId = (est.converted_retainer_id as string | null) ?? null;
  const alreadyConverted = !!(convertedInvoiceId || convertedProjectId || convertedRetainerId);
  const canEdit = status === "draft" || status === "sent";
  const canConvert = (status === "accepted" || status === "sent" || status === "viewed") && !alreadyConverted;
  const canSend = !SENDABLE_BLOCKED.has(status);
  const canMarkSent = status === "draft";
  const canDecide = status === "sent" || status === "viewed";
  const hasDecideItems = canDecide;

  const currency = est.currency_code;
  const cust = customerQ.data as any;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span>Estimate {est.estimate_number}</span>
                <StatusBadge status={est.status} />
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Issued {formatDate(est.issue_date)} · Expires {formatDate(est.expiration_date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button variant="outline" onClick={() => navigate(`/operations/estimates/${id}/edit`)}>
                  Edit
                </Button>
              )}
              {canConvert && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={converting}>
                      {converting ? "Converting…" : "Convert"} <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleConvert}>To invoice</DropdownMenuItem>
                    <DropdownMenuItem onClick={openProjectConvert}>To project</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleConvertRetainer}>To retainer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {alreadyConverted && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (convertedInvoiceId) navigate(`/operations/invoices/${convertedInvoiceId}`);
                    else if (convertedProjectId) navigate(`/operations/projects/${convertedProjectId}`);
                    else if (convertedRetainerId) navigate(`/operations/retainers/${convertedRetainerId}`);
                  }}
                >
                  View {convertedInvoiceId ? "invoice" : convertedProjectId ? "project" : "retainer"}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canSend && (
                    <DropdownMenuItem disabled={sending} onClick={handleSend}>
                      Send to customer
                    </DropdownMenuItem>
                  )}
                  {canMarkSent && (
                    <DropdownMenuItem onClick={handleMarkSent}>Mark as sent</DropdownMenuItem>
                  )}
                  {hasDecideItems && <DropdownMenuSeparator />}
                  {canDecide && (
                    <DropdownMenuItem onClick={() => setConfirm("mark_accepted")}>
                      Mark accepted
                    </DropdownMenuItem>
                  )}
                  {canDecide && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirm("mark_declined")}
                    >
                      Mark declined
                    </DropdownMenuItem>
                  )}
                  {canDecide && (
                    <DropdownMenuItem onClick={() => setConfirm("mark_expired")}>
                      Mark expired
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{cust?.display_name ?? "—"}</dd>
              <dd className="text-muted-foreground">{cust?.email ?? ""}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Billing address</dt>
              <dd className="whitespace-pre-line">{formatAddress(cust?.billing_address)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
        <CardContent>
          {linesQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !linesQ.data || linesQ.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No line items.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linesQ.data.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.description ?? "—"}</TableCell>
                    <TableCell className="text-right">{l.quantity ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.unit_price, currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.line_total, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-6 ml-auto max-w-sm space-y-1 text-sm">
            <TotalRow label="Subtotal" value={formatMoney(est.subtotal_amount, currency)} />
            <TotalRow label="Tax" value={formatMoney(est.tax_amount, currency)} />
            <TotalRow label="Total" value={formatMoney(est.total_amount, currency)} bold />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "mark_accepted" && "Mark estimate as accepted?"}
              {confirm === "mark_declined" && "Mark estimate as declined?"}
              {confirm === "mark_expired" && "Mark estimate as expired?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "mark_accepted" && "This records the customer's acceptance."}
              {confirm === "mark_declined" && "This records the customer's decline."}
              {confirm === "mark_expired" && "This marks the estimate as expired."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => { e.preventDefault(); runConfirmed(); }}
            >
              {acting ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Project name</Label>
              <Input id="proj-name" value={projName} onChange={(e) => setProjName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Billing method</Label>
              <Select value={projBilling} onValueChange={(v) => setProjBilling(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No hourly billing</SelectItem>
                  <SelectItem value="project_hours">Project hourly</SelectItem>
                  <SelectItem value="task_hours">Task hourly</SelectItem>
                  <SelectItem value="staff_hours">Staff hourly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                With “No hourly billing”, the estimate’s line items are copied to the project as billable charges. Hourly methods create the project with the estimate total as its budget only.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)} disabled={converting}>Cancel</Button>
            <Button onClick={handleConvertProject} disabled={converting}>
              {converting ? "Converting…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatAddress(addr: any): string {
  if (!addr) return "—";
  if (typeof addr === "string") return addr;
  const parts = [addr.line1, addr.line2, [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "), addr.country];
  return parts.filter(Boolean).join("\n") || "—";
}

async function readFunctionsErrorMessage(error: any): Promise<string | null> {
  try {
    const ctx = error?.context;
    if (!ctx) return error?.message ?? null;
    if (typeof ctx.json === "function") {
      const body = await ctx.clone().json().catch(() => null);
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
    if (typeof ctx.text === "function") {
      const txt = await ctx.clone().text().catch(() => "");
      if (txt) return txt;
    }
    if (typeof ctx === "object" && (ctx.error || ctx.message)) {
      return String(ctx.error ?? ctx.message);
    }
  } catch {
    /* ignore */
  }
  return error?.message ?? null;
}
