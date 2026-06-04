import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function RetainerForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customersQ = useQuery({
    queryKey: ["ops", "customers", "select-list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("id, display_name, default_currency_code")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!customerId || !customersQ.data) return;
    const c = customersQ.data.find((x: any) => x.id === customerId) as any;
    if (c?.default_currency_code) setCurrency(c.default_currency_code);
  }, [customerId, customersQ.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setError("Customer is required."); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError("Amount must be greater than 0."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("ops_create_retainer" as any, {
        p_header: {
          customer_id: customerId,
          amount: amt,
          issue_date: issueDate || null,
          currency_code: currency.trim() || "USD",
          notes: notes.trim() || null,
        },
      });
      if (rpcError) throw rpcError;
      toast.success("Retainer created");
      qc.invalidateQueries({ queryKey: ["ops", "retainers", "list"] });
      navigate(`/operations/retainers/${data as unknown as string}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create retainer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New retainer</h1>
        <p className="text-muted-foreground text-sm">Operations · Retainer</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId} disabled={customersQ.isLoading}>
                  <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  <SelectContent>
                    {(customersQ.data ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency_code">Currency</Label>
                <Input
                  id="currency_code"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/operations/retainers")} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create retainer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
