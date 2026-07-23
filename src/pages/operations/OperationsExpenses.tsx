import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Receipt, Pencil, ArrowUpDown, Search } from "lucide-react";
import { formatMoney } from "./_shared";
import LogExpenseDialog, { ExpenseRecord } from "./LogExpenseDialog";
import ReceiptViewerDialog from "./ReceiptViewerDialog";

type SortKey = "date" | "amount" | "customer" | "project" | "category" | "vendor";

export default function OperationsExpenses() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<
    (ExpenseRecord & { project_id: string | null; customer_id: string | null }) | null
  >(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [billableFilter, setBillableFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [receiptFilter, setReceiptFilter] = useState("all");
  const [loggedByFilter, setLoggedByFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const expensesQ = useQuery({
    queryKey: ["ops", "expenses-all"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("expenses")
        .select(
          "id, date, amount, currency_code, vendor_name, notes, is_billable, is_invoiced, is_mileage, markup_percentage, miles_driven, per_mile_rate, expense_category_id, receipt_storage_path, customer_id, project_id, created_by, expense_categories(name), projects(id, name, customer_id, customers(display_name)), customers(display_name)"
        )
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const orgUsersQ = useQuery({
    queryKey: ["ops", "org-users"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("users" as any)
        .select("id, full_name, email")
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const usersById = useMemo(
    () => new Map((orgUsersQ.data ?? []).map((u: any) => [u.id, u])),
    [orgUsersQ.data]
  );

  const enriched = useMemo(() => {
    return (expensesQ.data ?? []).map((e: any) => {
      const customerName = e.customers?.display_name ?? e.projects?.customers?.display_name ?? null;
      const u = usersById.get(e.created_by);
      return {
        ...e,
        _customerName: customerName,
        _projectName: e.projects?.name ?? null,
        _categoryName: e.expense_categories?.name ?? null,
        _loggedBy: (u?.full_name || u?.email) ?? null,
      };
    });
  }, [expensesQ.data, usersById]);

  const rows = useMemo(() => {
    let out = enriched.filter((r: any) => {
      if (customerFilter !== "all" && r._customerName !== customerFilter) return false;
      if (projectFilter !== "all" && (r.project_id ?? "none") !== projectFilter) return false;
      if (categoryFilter !== "all" && (r.expense_category_id ?? "none") !== categoryFilter) return false;
      if (billableFilter === "yes" && !r.is_billable) return false;
      if (billableFilter === "no" && r.is_billable) return false;
      if (statusFilter === "invoiced" && !r.is_invoiced) return false;
      if (statusFilter === "unbilled" && r.is_invoiced) return false;
      if (receiptFilter === "attached" && !r.receipt_storage_path) return false;
      if (receiptFilter === "missing" && r.receipt_storage_path) return false;
      if (loggedByFilter !== "all" && (r.created_by ?? "none") !== loggedByFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [r.vendor_name, r.notes, r._customerName, r._projectName, r._categoryName, r._loggedBy]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    out = [...out].sort((a: any, b: any) => {
      let av: any;
      let bv: any;
      switch (sortKey) {
        case "amount": av = Number(a.amount); bv = Number(b.amount); break;
        case "customer": av = a._customerName ?? ""; bv = b._customerName ?? ""; break;
        case "project": av = a._projectName ?? ""; bv = b._projectName ?? ""; break;
        case "category": av = a._categoryName ?? ""; bv = b._categoryName ?? ""; break;
        case "vendor": av = a.vendor_name ?? ""; bv = b.vendor_name ?? ""; break;
        case "date":
        default: av = a.date ?? ""; bv = b.date ?? ""; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return out;
  }, [enriched, search, customerFilter, projectFilter, categoryFilter, billableFilter, statusFilter, receiptFilter, loggedByFilter, sortKey, sortDir]);

  const customerOptions = useMemo(() => {
    const s = new Set<string>();
    enriched.forEach((e: any) => { if (e._customerName) s.add(e._customerName); });
    return Array.from(s).sort();
  }, [enriched]);
  const projectOptions = useMemo(() => {
    const m = new Map<string, string>();
    enriched.forEach((e: any) => { if (e.project_id && e._projectName) m.set(e.project_id, e._projectName); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [enriched]);
  const categoryOptions = useMemo(() => {
    const m = new Map<string, string>();
    enriched.forEach((e: any) => { if (e.expense_category_id && e._categoryName) m.set(e.expense_category_id, e._categoryName); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [enriched]);
  const loggedByOptions = useMemo(() => {
    const m = new Map<string, string>();
    enriched.forEach((e: any) => { if (e.created_by) m.set(e.created_by, e._loggedBy ?? "Unknown"); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [enriched]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir(k === "date" || k === "amount" ? "desc" : "asc");
    }
  };

  const totalAmount = rows.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <p className="text-sm text-muted-foreground">
            All expenses across your projects and customers. {rows.length} shown · {formatMoney(totalAmount, "USD")} total.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Vendor, notes, customer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Customer</Label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {customerOptions.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projectOptions.map(([idv, name]) => (<SelectItem key={idv} value={idv}>{name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Expense type</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {categoryOptions.map(([idv, name]) => (<SelectItem key={idv} value={idv}>{name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Logged by</Label>
              <Select value={loggedByFilter} onValueChange={setLoggedByFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  {loggedByOptions.map(([idv, name]) => (<SelectItem key={idv} value={idv}>{name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Billable</Label>
              <Select value={billableFilter} onValueChange={setBillableFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Billable</SelectItem>
                  <SelectItem value="no">Non-billable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unbilled">Unbilled</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Receipt</Label>
              <Select value={receiptFilter} onValueChange={setReceiptFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="attached">Has receipt</SelectItem>
                  <SelectItem value="missing">Missing receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {expensesQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses match your filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Customer" k="customer" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Project" k="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Category" k="category" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHead label="Vendor" k="vendor" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <TableHead className="text-right">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("amount")}>
                      Amount <ArrowUpDown className="h-3 w-3" />
                      {sortKey === "amount" ? <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
                    </button>
                  </TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r._customerName ?? "—"}</TableCell>
                    <TableCell>
                      {r.project_id && r._projectName ? (
                        <Link to={`/operations/projects/${r.project_id}`} className="underline">{r._projectName}</Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{r._categoryName ?? "—"}</TableCell>
                    <TableCell>{r.vendor_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.amount, r.currency_code)}</TableCell>
                    <TableCell>{r.is_billable ? "Yes" : "No"}</TableCell>
                    <TableCell>{r.is_invoiced ? "Invoiced" : "Unbilled"}</TableCell>
                    <TableCell>
                      {r.receipt_storage_path ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View receipt"
                          onClick={() => { setViewing(r); setViewerOpen(true); }}
                        >
                          <Receipt className="h-4 w-4 text-[var(--bw-forest)]" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Attach receipt"
                          onClick={() => { setEditing(r); setEditOpen(true); }}
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit expense"
                        onClick={() => { setEditing(r); setEditOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LogExpenseDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["ops", "expenses-all"] });
          }
        }}
        projectId={editing?.project_id ?? ""}
        customerId={editing?.customer_id ?? null}
        expense={editing}
      />

      <ReceiptViewerDialog
        open={viewerOpen}
        onOpenChange={(o) => { setViewerOpen(o); if (!o) setViewing(null); }}
        receiptPath={viewing?.receipt_storage_path ?? null}
        onEdit={() => {
          setViewerOpen(false);
          setEditing(viewing);
          setEditOpen(true);
        }}
      />
    </div>
  );
}

function SortableHead({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  return (
    <TableHead>
      <button className="inline-flex items-center gap-1" onClick={() => onSort(k)}>
        {label} <ArrowUpDown className="h-3 w-3" />
        {sortKey === k ? <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
      </button>
    </TableHead>
  );
}
