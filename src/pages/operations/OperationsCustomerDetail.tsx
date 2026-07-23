import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Trash2 } from "lucide-react";
import CustomerFormDialog from "./CustomerFormDialog";
import ProjectFormDialog from "./ProjectFormDialog";
import ApplyToInvoiceDialog from "./ApplyToInvoiceDialog";
import ContactFormDialog from "./ContactFormDialog";
import { StatusBadge, formatMoney, formatDate } from "./_shared";
import { downloadStatementPdf } from "@/lib/operations/documentPdf";

const BILLING_LABELS: Record<string, string> = {
  fixed: "Fixed cost",
  project_hours: "Project hourly",
  task_hours: "Task hourly",
  staff_hours: "Staff hourly",
};

const humanize = (s: string | null | undefined) =>
  (s ?? "").replace(/_/g, " ").trim();

const maskTail = (v: string | null | undefined) =>
  v ? "••••" + String(v).slice(-4) : "—";

export default function OperationsCustomerDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [applyCreditCreditId, setApplyCreditCreditId] = useState<string | null>(null);
  const [applyCreditMax, setApplyCreditMax] = useState<number>(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [revealRemit, setRevealRemit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await opsSupabase.auth.getUser();
      if (!auth.user?.id) return;
      const { data } = await opsSupabase
        .from("users" as any)
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (!cancelled) setIsAdmin((data as any)?.role === "admin");
    })();
    return () => { cancelled = true; };
  }, []);

  const today = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();
  const [stmtFrom, setStmtFrom] = useState<string>("");
  const [stmtTo, setStmtTo] = useState<string>(today);
  const [stmtUnpaidOnly, setStmtUnpaidOnly] = useState<boolean>(false);
  const [stmtData, setStmtData] = useState<any>(null);
  const [stmtLoading, setStmtLoading] = useState<boolean>(false);

  const orgBrandingQ = useQuery({
    queryKey: ["ops", "org-branding"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("organizations" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const customerQ = useQuery({
    queryKey: ["ops", "customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("customers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const accountSummaryQ = useQuery({
    queryKey: ["ops", "customer-account-summary", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customer_account_summary" as any)
        .select("outstanding_balance, open_invoice_count, unused_credit_amount, open_credit_count")
        .eq("customer_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const invoicesQ = useQuery({
    queryKey: ["ops", "customer-invoices", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("invoices")
        .select("id, invoice_number, status, issue_date, due_date, total_amount, balance_due, currency_code")
        .eq("customer_id", id)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectsQ = useQuery({
    queryKey: ["ops", "customer-projects", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("projects")
        .select("id, name, billing_method, status, budget_hours, budget_amount")
        .eq("customer_id", id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const timeRollupQ = useQuery({
    queryKey: ["ops", "customer-time-rollup", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("project_time_rollup")
        .select("total_hours, billable_hours, unbilled_billable_hours")
        .eq("customer_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const creditsQ = useQuery({
    queryKey: ["ops", "customer-credits", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customer_credits")
        .select("id, source_type, amount, applied_amount, available_balance, created_at")
        .eq("customer_id", id)
        .gt("available_balance", 0)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const estimatesQ = useQuery({
    queryKey: ["ops", "customer-estimates", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("estimates")
        .select("id, estimate_number, status, issue_date, expiration_date, total_amount, currency_code")
        .eq("customer_id", id)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["ops", "customer-payments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("payments")
        .select("id, payment_date, amount, payment_mode, reference_number, refunded_amount, currency_code")
        .eq("customer_id", id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const creditNotesQ = useQuery({
    queryKey: ["ops", "customer-credit-notes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("credit_notes")
        .select("id, credit_note_number, issue_date, status, total_amount, balance, currency_code")
        .eq("customer_id", id)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const expensesQ = useQuery({
    queryKey: ["ops", "customer-expenses", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("expenses")
        .select("id, date, vendor_name, amount, currency_code, is_billable, is_invoiced")
        .eq("customer_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const contactsQ = useQuery({
    queryKey: ["ops", "customer-contacts", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_contacts" as any, { p_customer_id: id });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const timeTotals = (timeRollupQ.data ?? []).reduce(
    (acc, r: any) => ({
      total: acc.total + (Number(r.total_hours) || 0),
      billable: acc.billable + (Number(r.billable_hours) || 0),
      unbilled: acc.unbilled + (Number(r.unbilled_billable_hours) || 0),
    }),
    { total: 0, billable: 0, unbilled: 0 },
  );

  const c = customerQ.data as any;
  const cur = c?.default_currency_code || "USD";
  const summary = accountSummaryQ.data as any;

  const handleDeleteContact = async (row: any) => {
    if (!window.confirm(`Delete contact "${[row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "contact"}"?`)) return;
    const { error } = await supabase.rpc("ops_delete_contact" as any, { p_id: row.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact deleted");
    qc.invalidateQueries({ queryKey: ["ops", "customer-contacts", id] });
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>{c?.display_name ?? (customerQ.isLoading ? "Loading…" : "Customer")}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!c} onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" disabled={!c} onClick={() => navigate(`/operations/invoices/from-work?customer=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              New invoice from work
            </Button>
            <Button size="sm" disabled={!c} onClick={() => navigate(`/operations/invoices/new?customer=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              New invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerQ.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !c ? (
            <p className="text-destructive text-sm">Customer not found.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Outstanding balance</div>
                  <div className="text-base font-semibold">{formatMoney(summary?.outstanding_balance ?? 0, cur)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Open invoices</div>
                  <div className="text-base font-semibold">{summary?.open_invoice_count ?? 0}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Unused credit</div>
                  <div className="text-base font-semibold">{formatMoney(summary?.unused_credit_amount ?? 0, cur)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Open credits</div>
                  <div className="text-base font-semibold">{summary?.open_credit_count ?? 0}</div>
                </div>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Email</dt><dd>{c.email ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Phone</dt><dd>{c.phone ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{c.status ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Default currency</dt><dd>{c.default_currency_code ?? "—"}</dd></div>
              </dl>

              {timeRollupQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading time…</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Time · Total {timeTotals.total} h · Billable {timeTotals.billable} h · Unbilled {timeTotals.unbilled} h
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="projects">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="credit_notes">Credit Notes</TabsTrigger>
          <TabsTrigger value="account_credit">Account Credit</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="statement">Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Projects</CardTitle>
              <Button size="sm" disabled={!c} onClick={() => setProjectOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New project
              </Button>
            </CardHeader>
            <CardContent>
              {projectsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !projectsQ.data || projectsQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No projects yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Billing method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsQ.data.map((proj: any) => (
                      <TableRow
                        key={proj.id}
                        onClick={() => navigate(`/operations/projects/${proj.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">{proj.name}</TableCell>
                        <TableCell>{BILLING_LABELS[proj.billing_method] ?? proj.billing_method ?? "—"}</TableCell>
                        <TableCell className="capitalize">{proj.status ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
            <CardContent>
              {invoicesQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !invoicesQ.data || invoicesQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No invoices yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Issue date</TableHead>
                      <TableHead>Due date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesQ.data.map((inv) => (
                      <TableRow
                        key={inv.id}
                        onClick={() => navigate(`/operations/invoices/${inv.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{formatDate(inv.issue_date)}</TableCell>
                        <TableCell>{formatDate(inv.due_date)}</TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell className="text-right">{formatMoney(inv.total_amount, inv.currency_code)}</TableCell>
                        <TableCell className="text-right">{formatMoney(inv.balance_due, inv.currency_code)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates">
          <Card>
            <CardHeader><CardTitle>Estimates</CardTitle></CardHeader>
            <CardContent>
              {estimatesQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !estimatesQ.data || estimatesQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No estimates yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estimate #</TableHead>
                      <TableHead>Issue date</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimatesQ.data.map((row: any) => (
                      <TableRow
                        key={row.id}
                        onClick={() => navigate(`/operations/estimates/${row.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">{row.estimate_number}</TableCell>
                        <TableCell>{formatDate(row.issue_date)}</TableCell>
                        <TableCell>{formatDate(row.expiration_date)}</TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                        <TableCell className="text-right">{formatMoney(row.total_amount, row.currency_code)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
            <CardContent>
              {paymentsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !paymentsQ.data || paymentsQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No payments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Refunded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsQ.data.map((row: any) => {
                      const refunded = Number(row.refunded_amount) || 0;
                      const rowCur = row.currency_code || cur;
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.payment_date)}</TableCell>
                          <TableCell className="capitalize">{humanize(row.payment_mode) || "—"}</TableCell>
                          <TableCell className="text-right">{formatMoney(row.amount, rowCur)}</TableCell>
                          <TableCell className="text-right">{refunded > 0 ? formatMoney(refunded, rowCur) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit_notes">
          <Card>
            <CardHeader><CardTitle>Credit notes</CardTitle></CardHeader>
            <CardContent>
              {creditNotesQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !creditNotesQ.data || creditNotesQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No credit notes yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credit note #</TableHead>
                      <TableHead>Issue date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNotesQ.data.map((row: any) => (
                      <TableRow
                        key={row.id}
                        onClick={() => navigate(`/operations/credit-notes/${row.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">{row.credit_note_number}</TableCell>
                        <TableCell>{formatDate(row.issue_date)}</TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                        <TableCell className="text-right">{formatMoney(row.total_amount, row.currency_code || cur)}</TableCell>
                        <TableCell className="text-right">{formatMoney(row.balance, row.currency_code || cur)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account_credit">
          <Card>
            <CardHeader><CardTitle>Account credits</CardTitle></CardHeader>
            <CardContent>
              {creditsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !creditsQ.data || creditsQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No account credit.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Applied</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditsQ.data.map((row: any) => {
                      const avail = Number(row.available_balance) || 0;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="capitalize">{String(row.source_type ?? "").replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-right">{formatMoney(row.amount, cur)}</TableCell>
                          <TableCell className="text-right">{formatMoney(row.applied_amount, cur)}</TableCell>
                          <TableCell className="text-right">{formatMoney(row.available_balance, cur)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={avail <= 0}
                              onClick={() => {
                                setApplyCreditCreditId(row.id);
                                setApplyCreditMax(avail);
                              }}
                            >
                              Apply to invoice
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
            <CardContent>
              {expensesQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !expensesQ.data || expensesQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No expenses yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Invoiced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesQ.data.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell>{row.vendor_name ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatMoney(row.amount, row.currency_code || cur)}</TableCell>
                        <TableCell>{row.is_billable ? "Yes" : "No"}</TableCell>
                        <TableCell>{row.is_invoiced ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Contacts</CardTitle>
              <Button
                size="sm"
                disabled={!c}
                onClick={() => {
                  setEditingContact(null);
                  setContactDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add contact
              </Button>
            </CardHeader>
            <CardContent>
              {contactsQ.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : !contactsQ.data || contactsQ.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">No contacts yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactsQ.data.map((row: any) => {
                      const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "—";
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-2">
                              {name}
                              {row.is_primary && <Badge variant="secondary">Primary</Badge>}
                            </span>
                          </TableCell>
                          <TableCell>{row.email ?? "—"}</TableCell>
                          <TableCell>{row.phone ?? "—"}</TableCell>
                          <TableCell>{row.role ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingContact(row);
                                  setContactDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteContact(row)}
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="statement">
          <Card>
            <CardHeader><CardTitle>Statement of account</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stmt-from">From</Label>
                  <Input
                    id="stmt-from"
                    type="date"
                    value={stmtFrom}
                    onChange={(e) => setStmtFrom(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stmt-to">To</Label>
                  <Input
                    id="stmt-to"
                    type="date"
                    value={stmtTo}
                    onChange={(e) => setStmtTo(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    id="stmt-unpaid"
                    checked={stmtUnpaidOnly}
                    onCheckedChange={setStmtUnpaidOnly}
                  />
                  <Label htmlFor="stmt-unpaid" className="cursor-pointer">Unpaid invoices only</Label>
                </div>
                <div className="flex items-center gap-2 pb-2 ml-auto">
                  <Button
                    size="sm"
                    disabled={!c || stmtLoading}
                    onClick={async () => {
                      setStmtLoading(true);
                      const { data, error } = await supabase.rpc("ops_customer_statement" as any, {
                        p_customer_id: id,
                        p_from: stmtFrom || null,
                        p_to: stmtTo || null,
                        p_unpaid_only: stmtUnpaidOnly,
                      });
                      setStmtLoading(false);
                      if (error) {
                        toast.error(error.message);
                        return;
                      }
                      setStmtData(data);
                    }}
                  >
                    {stmtLoading ? "Generating…" : "Generate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!stmtData}
                    onClick={async () => {
                      try {
                        await downloadStatementPdf(
                          { branding: (orgBrandingQ.data ?? {}) as any, statement: stmtData },
                          `Statement-${c?.display_name ?? "customer"}.pdf`,
                        );
                      } catch (err: any) {
                        toast.error(err?.message ?? "Failed to download statement");
                      }
                    }}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>

              {stmtData && (() => {
                const stmtCur = stmtData.customer?.currency_code || cur;
                return (
                  <div className="space-y-6">
                    {!stmtData.unpaid_only && (
                      <>
                        <div className="flex justify-end text-sm">
                          <div className="w-72 flex justify-between border-b py-1">
                            <span className="text-muted-foreground">Opening balance</span>
                            <span>{formatMoney(stmtData.opening_balance ?? 0, stmtCur)}</span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold mb-2">Ledger</h3>
                          {!stmtData.transactions || stmtData.transactions.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No transactions in this period.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Reference</TableHead>
                                  <TableHead className="text-right">Debit</TableHead>
                                  <TableHead className="text-right">Credit</TableHead>
                                  <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stmtData.transactions.map((t: any, i: number) => (
                                  <TableRow key={i}>
                                    <TableCell>{formatDate(t.date)}</TableCell>
                                    <TableCell className="capitalize">{t.type ?? ""}</TableCell>
                                    <TableCell>{t.number ?? ""}</TableCell>
                                    <TableCell className="text-right">{Number(t.debit) ? formatMoney(t.debit, stmtCur) : ""}</TableCell>
                                    <TableCell className="text-right">{Number(t.credit) ? formatMoney(t.credit, stmtCur) : ""}</TableCell>
                                    <TableCell className="text-right">{formatMoney(t.balance, stmtCur)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>

                        <div className="flex justify-end text-sm">
                          <div className="w-72 flex justify-between border-b py-1 font-semibold">
                            <span>Closing balance</span>
                            <span>{formatMoney(stmtData.closing_balance, stmtCur)}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold mb-2">Open invoices</h3>
                      {!stmtData.open_invoices || stmtData.open_invoices.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No open invoices.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Issue date</TableHead>
                              <TableHead>Due date</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Balance due</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stmtData.open_invoices.map((r: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{r.invoice_number}</TableCell>
                                <TableCell>{formatDate(r.issue_date)}</TableCell>
                                <TableCell>{formatDate(r.due_date)}</TableCell>
                                <TableCell className="text-right">{formatMoney(r.total_amount, stmtCur)}</TableCell>
                                <TableCell className="text-right">{formatMoney(r.balance_due, stmtCur)}</TableCell>
                                <TableCell><StatusBadge status={r.status} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="flex justify-end text-sm">
                      <div className="w-72 flex justify-between border-b py-1 font-semibold">
                        <span>Total outstanding</span>
                        <span>{formatMoney(stmtData.total_outstanding, stmtCur)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={c ?? null} />
      {id && (
        <ProjectFormDialog
          open={projectOpen}
          onOpenChange={setProjectOpen}
          customerId={id}
        />
      )}
      {id && (
        <ContactFormDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          customerId={id}
          contact={editingContact}
          onSaved={() => qc.invalidateQueries({ queryKey: ["ops", "customer-contacts", id] })}
        />
      )}
      {id && applyCreditCreditId && (
        <ApplyToInvoiceDialog
          open={!!applyCreditCreditId}
          onOpenChange={(o) => { if (!o) setApplyCreditCreditId(null); }}
          customerId={id}
          currency={c?.default_currency_code || "USD"}
          maxAmount={applyCreditMax}
          title="Apply credit to invoice"
          onApply={async (invId, amt) => {
            const { error } = await supabase.rpc("ops_apply_customer_credit_to_invoice" as any, {
              p_credit: applyCreditCreditId,
              p_invoice: invId,
              p_amount: amt,
            });
            if (error) throw error;
          }}
          onApplied={() => {
            toast.success("Credit applied.");
            qc.invalidateQueries({ queryKey: ["ops", "customer-credits", id] });
            qc.invalidateQueries({ queryKey: ["ops", "customer-invoices", id] });
          }}
        />
      )}
    </div>
  );
}
