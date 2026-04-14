import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { jsPDF } from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Search, X } from "lucide-react";

interface Transaction {
  payment_intent_id: string;
  created_at: string;
  client_email: string;
  client_name: string;
  instruments: string[];
  total_amount: number;
  status: "Completed" | "In Progress" | "Sent";
}

const PRICE_PER_INSTRUMENT = 29.99;

export default function CoachInvoices() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [instrumentNames, setInstrumentNames] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Receipt modal
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // Export by client dropdown
  const [exportClient, setExportClient] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      // Fetch coach_clients with payment intent
      const { data: rows, error } = await supabase
        .from("coach_clients")
        .select("id, created_at, client_email, instrument_id, invitation_status, stripe_payment_intent_id")
        .eq("coach_user_id", user.id)
        .not("stripe_payment_intent_id", "is", null);

      if (error || !rows || rows.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Fetch instrument names
      const instrumentIds = [...new Set(rows.map((r) => r.instrument_id).filter(Boolean))] as string[];
      let instrumentMap: Record<string, string> = {};
      if (instrumentIds.length > 0) {
        const { data: instruments } = await supabase
          .from("instruments")
          .select("id, instrument_name")
          .in("id", instrumentIds);
        if (instruments) {
          instruments.forEach((i) => {
            instrumentMap[i.id] = i.instrument_name;
          });
          setInstrumentNames([...new Set(instruments.map((i) => i.instrument_name))]);
        }
      }

      // Fetch client names by email
      const emails = [...new Set(rows.map((r) => r.client_email))];
      let nameMap: Record<string, string> = {};
      if (emails.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("email, full_name")
          .in("email", emails);
        if (users) {
          users.forEach((u) => {
            if (u.full_name) nameMap[u.email] = u.full_name;
          });
        }
      }

      // Group by stripe_payment_intent_id
      const grouped: Record<string, typeof rows> = {};
      rows.forEach((r) => {
        const key = r.stripe_payment_intent_id!;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      });

      const txList: Transaction[] = Object.entries(grouped).map(([piId, items]) => {
        const earliest = items.reduce((min, r) => (r.created_at < min ? r.created_at : min), items[0].created_at);
        const email = items[0].client_email;
        const instruments = items
          .map((r) => (r.instrument_id ? instrumentMap[r.instrument_id] || "Unknown" : "Unknown"))
          .filter(Boolean);

        let status: Transaction["status"] = "Sent";
        const allCompleted = items.every((r) => r.invitation_status === "completed");
        const anyOpened = items.some((r) => r.invitation_status === "opened" || r.invitation_status === "completed");
        if (allCompleted) status = "Completed";
        else if (anyOpened) status = "In Progress";

        return {
          payment_intent_id: piId,
          created_at: earliest,
          client_email: email,
          client_name: nameMap[email] || email,
          instruments,
          total_amount: instruments.length * PRICE_PER_INSTRUMENT,
          status,
        };
      });

      txList.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setTransactions(txList);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.client_name.toLowerCase().includes(q) || t.client_email.toLowerCase().includes(q)
      );
    }
    if (instrumentFilter && instrumentFilter !== "all") {
      result = result.filter((t) => t.instruments.includes(instrumentFilter));
    }
    if (dateFrom) {
      const from = startOfDay(parseISO(dateFrom));
      result = result.filter((t) => !isBefore(parseISO(t.created_at), from));
    }
    if (dateTo) {
      const to = endOfDay(parseISO(dateTo));
      result = result.filter((t) => !isAfter(parseISO(t.created_at), to));
    }
    return result;
  }, [transactions, search, instrumentFilter, dateFrom, dateTo]);

  const uniqueClients = useMemo(() => {
    const names = [...new Set(transactions.map((t) => t.client_name))];
    return names.sort();
  }, [transactions]);

  const clearFilters = () => {
    setSearch("");
    setInstrumentFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // ---- PDF Generation ----
  function generatePdf(txs: Transaction[], filterDesc?: string) {
    const doc = new jsPDF();
    const now = format(new Date(), "MMM d, yyyy");

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BrainWise", 14, 20);
    doc.setFontSize(14);
    doc.text("Orders & Invoices", 14, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${now}`, 14, 38);
    if (filterDesc) doc.text(filterDesc, 14, 44);

    // Table header
    let y = filterDesc ? 54 : 48;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [14, 44, 80, 130, 155, 180];
    doc.text("Date", cols[0], y);
    doc.text("Client", cols[1], y);
    doc.text("Assessments", cols[2], y);
    doc.text("Amount", cols[3], y);
    doc.text("Status", cols[4], y);
    y += 2;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    txs.forEach((tx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const dateStr = format(parseISO(tx.created_at), "MMM d, yyyy");
      const assessments = tx.instruments.join(", ");
      const truncAssessments = assessments.length > 30 ? assessments.substring(0, 27) + "..." : assessments;
      doc.text(dateStr, cols[0], y);
      doc.text(tx.client_name.substring(0, 20), cols[1], y);
      doc.text(truncAssessments, cols[2], y);
      doc.text(`$${tx.total_amount.toFixed(2)}`, cols[3], y);
      doc.text(tx.status, cols[4], y);
      y += 7;
    });

    // Footer
    y = Math.max(y + 10, 280);
    if (y > 280) {
      doc.addPage();
      y = 280;
    }
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text("Confidential — BrainWise Enterprises", 14, 288);

    doc.save(`BrainWise-Invoices-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }

  function exportSinglePdf(tx: Transaction) {
    const doc = new jsPDF();
    const dateStr = format(parseISO(tx.created_at), "MMM d, yyyy");
    const idShort = `#${tx.payment_intent_id.slice(-8)}`;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BrainWise", 14, 20);
    doc.setFontSize(14);
    doc.text("Receipt", 14, 30);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${dateStr}`, 14, 42);
    doc.text(`Transaction: ${idShort}`, 14, 49);
    doc.text(`Client: ${tx.client_name}`, 14, 56);
    doc.text(`Email: ${tx.client_email}`, 14, 63);

    let y = 78;
    doc.setFont("helvetica", "bold");
    doc.text("Assessment", 14, y);
    doc.text("Price", 150, y);
    y += 2;
    doc.line(14, y, 196, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    tx.instruments.forEach((name) => {
      doc.text(name, 14, y);
      doc.text(`$${PRICE_PER_INSTRUMENT.toFixed(2)}`, 150, y);
      y += 7;
    });

    y += 3;
    doc.line(14, y, 196, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Total", 14, y);
    doc.text(`$${tx.total_amount.toFixed(2)}`, 150, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Status: ${tx.status}`, 14, y);

    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text("Confidential — BrainWise Enterprises", 14, 288);

    doc.save(`BrainWise-Receipt-${idShort.replace("#", "")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }

  const statusBadge = (status: Transaction["status"]) => {
    const variant =
      status === "Completed" ? "default" : status === "In Progress" ? "secondary" : "outline";
    const cls =
      status === "Completed"
        ? "bg-green-600 hover:bg-green-700 text-white"
        : status === "In Progress"
        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
        : "bg-muted text-muted-foreground";
    return (
      <Badge variant={variant} className={cls}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Orders & Invoices</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Assessments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assessments</SelectItem>
                {instrumentNames.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
            <Button variant="outline" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" /> Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => generatePdf(filtered, search || instrumentFilter !== "all" ? "Filtered results" : undefined)} className="gap-2">
          <Download className="h-4 w-4" /> Export All as PDF
        </Button>
        <div className="flex gap-2 items-center">
          <Select value={exportClient} onValueChange={setExportClient}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Export by Client" />
            </SelectTrigger>
            <SelectContent>
              {uniqueClients.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {exportClient && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const clientTxs = transactions.filter((t) => t.client_name === exportClient);
                generatePdf(clientTxs, `Client: ${exportClient}`);
              }}
            >
              Export
            </Button>
          )}
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="outline"
            onClick={() => generatePdf(filtered, `Date range: ${dateFrom || "start"} – ${dateTo || "now"}`)}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Export Range as PDF
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No transactions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Assessments</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TableRow key={tx.payment_intent_id}>
                    <TableCell>{format(parseISO(tx.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{tx.client_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.instruments.join(", ")}</TableCell>
                    <TableCell>${tx.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{statusBadge(tx.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setReceiptTx(tx)} className="gap-1">
                          <FileText className="h-4 w-4" /> View Receipt
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => exportSinglePdf(tx)} className="gap-1">
                          <Download className="h-4 w-4" /> Export PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <Dialog open={!!receiptTx} onOpenChange={(open) => !open && setReceiptTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receiptTx && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">BrainWise</h3>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(receiptTx.created_at), "MMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  #{receiptTx.payment_intent_id.slice(-8)}
                </p>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Client:</span> {receiptTx.client_name}</p>
                <p><span className="font-medium">Email:</span> {receiptTx.client_email}</p>
              </div>
              <div className="border-t pt-3 space-y-2">
                {receiptTx.instruments.map((name, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{name}</span>
                    <span>${PRICE_PER_INSTRUMENT.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total</span>
                  <span>${receiptTx.total_amount.toFixed(2)}</span>
                </div>
              </div>
              <div>{statusBadge(receiptTx.status)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
