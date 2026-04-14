import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { PLANS } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, ExternalLink, MessageSquare, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";

interface PurchaseRow {
  id: string;
  instrument_id: string;
  instrument_name: string;
  amount_paid: number;
  stripe_payment_intent_id: string;
  purchased_at: string;
}

export default function BillingSettings() {
  const { user } = useAuth();
  const { subscription, loading, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [receiptItem, setReceiptItem] = useState<PurchaseRow | null>(null);

  const tier = subscription?.tier || "base";
  const plan = PLANS[tier as keyof typeof PLANS] || PLANS.base;
  const isActive = subscription?.subscribed === true;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rows } = await supabase
        .from("assessment_purchases")
        .select("id, instrument_id, amount_paid, stripe_payment_intent_id, purchased_at")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });

      if (!rows || rows.length === 0) {
        setPurchasesLoading(false);
        return;
      }

      const { data: instruments } = await supabase
        .from("instruments")
        .select("id, instrument_id, instrument_name");

      const nameMap: Record<string, string> = {};
      (instruments ?? []).forEach((i) => {
        nameMap[i.id] = i.instrument_name;
        nameMap[i.instrument_id] = i.instrument_name;
      });

      setPurchases(
        rows.map((r) => ({
          ...r,
          amount_paid: Number(r.amount_paid),
          stripe_payment_intent_id: r.stripe_payment_intent_id ?? "",
          instrument_name: nameMap[r.instrument_id] || r.instrument_id,
        }))
      );
      setPurchasesLoading(false);
    })();
  }, [user]);

  const filteredPurchases = purchases.filter(
    (p) =>
      p.instrument_name.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
      format(parseISO(p.purchased_at), "MMM d, yyyy")
        .toLowerCase()
        .includes(purchaseSearch.toLowerCase())
  );

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Could not open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const exportPurchasesPdf = () => {
    const doc = new jsPDF();
    const now = format(new Date(), "MMM d, yyyy");
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BrainWise", 14, 20);
    doc.setFontSize(14);
    doc.text("Purchase History", 14, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${now}`, 14, 38);
    let y = 50;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Date", 14, y);
    doc.text("Assessment", 44, y);
    doc.text("Amount", 130, y);
    doc.text("Transaction", 155, y);
    y += 2;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    filteredPurchases.forEach((p) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(format(parseISO(p.purchased_at), "MMM d, yyyy"), 14, y);
      doc.text(p.instrument_name.substring(0, 35), 44, y);
      doc.text(`$${p.amount_paid.toFixed(2)}`, 130, y);
      doc.text(`#${p.stripe_payment_intent_id.slice(-8)}`, 155, y);
      y += 7;
    });
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text("Confidential — BrainWise Enterprises", 14, 288);
    doc.save(`BrainWise-Purchases-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const endDate = subscription?.subscription_end
    ? new Date(subscription.subscription_end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and billing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !isActive ? (
            <>
              <div>
                <p className="text-lg font-semibold text-foreground">Free Account</p>
                <p className="text-sm text-muted-foreground">No active subscription</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">What's included:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Per-assessment purchases available ($29.99 each)</li>
                  <li>No AI chat included</li>
                  <li>No resources access</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {plan.name} Plan
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  </p>
                  {endDate && (
                    <p className="text-sm text-muted-foreground">
                      Next billing date: {endDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Included features:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">AI chat limit: {plan.ai_limit} messages/month</span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleManage} disabled={portalLoading} variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {portalLoading ? "Loading…" : "Manage Subscription"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!loading && (!isActive || tier === "base") && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Upgrade to Premium</CardTitle>
            <CardDescription>
              ${PLANS.premium.monthly.price}/mo or ${PLANS.premium.annual.price}/yr
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              {PLANS.premium.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Button onClick={() => navigate("/pricing")} className="w-full sm:w-auto">
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Purchase History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Purchase History</CardTitle>
          {filteredPurchases.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportPurchasesPdf} className="gap-2">
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search purchases…"
              value={purchaseSearch}
              onChange={(e) => setPurchaseSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {purchasesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : filteredPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No purchases yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(parseISO(p.purchased_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>{p.instrument_name}</TableCell>
                      <TableCell>${p.amount_paid.toFixed(2)}</TableCell>
                      <TableCell>#{p.stripe_payment_intent_id.slice(-8)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setReceiptItem(p)}>
                          <FileText className="h-4 w-4 mr-1" /> Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptItem} onOpenChange={(open) => !open && setReceiptItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receiptItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-foreground">BrainWise</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(receiptItem.purchased_at), "MMM d, yyyy")}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Transaction #{receiptItem.stripe_payment_intent_id.slice(-8)}
              </p>
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{receiptItem.instrument_name}</span>
                  <span className="text-foreground">${receiptItem.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">${receiptItem.amount_paid.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This is a record of your one-time assessment purchase.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
