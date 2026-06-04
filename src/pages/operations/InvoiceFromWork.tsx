import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "./_shared";

type Candidate = {
  candidate_type: string | null;
  org_id: string | null;
  customer_id: string | null;
  project_id: string | null;
  project_name: string | null;
  ref_id: string | null;
  ref_user_id: string | null;
  label: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  amount: number | null;
  currency_code: string | null;
  candidate_key: string | null;
};

export default function InvoiceFromWork() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lockedCustomerId = params.get("customer") || "";
  const [pickedCustomerId, setPickedCustomerId] = useState("");
  const customerId = lockedCustomerId || pickedCustomerId;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const customersQ = useQuery({
    queryKey: ["ops", "customers", "name-map"],
    enabled: !lockedCustomerId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("id, display_name")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lockedCustomerQ = useQuery({
    queryKey: ["ops", "customer", lockedCustomerId],
    enabled: !!lockedCustomerId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("customers")
        .select("id, display_name")
        .eq("id", lockedCustomerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const candidatesQ = useQuery({
    queryKey: ["ops", "invoiceable-candidates", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("invoiceable_candidates")
        .select("*")
        .eq("customer_id", customerId);
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });

  const candidates = candidatesQ.data ?? [];

  const groups = useMemo(() => {
    const map = new Map<string, { project_id: string | null; project_name: string; rows: Candidate[] }>();
    for (const row of candidates) {
      const key = row.project_id ?? "__none__";
      if (!map.has(key)) {
        map.set(key, {
          project_id: row.project_id,
          project_name: row.project_name ?? "No project",
          rows: [],
        });
      }
      map.get(key)!.rows.push(row);
    }
    return Array.from(map.values());
  }, [candidates]);

  const selectedRows = useMemo(
    () => candidates.filter((r) => r.candidate_key && selected.has(r.candidate_key)),
    [candidates, selected],
  );

  const selectedCurrencies = useMemo(() => {
    const set = new Set<string>();
    selectedRows.forEach((r) => {
      if (r.currency_code) set.add(r.currency_code);
    });
    return Array.from(set);
  }, [selectedRows]);

  const multiCurrency = selectedCurrencies.length > 1;
  const totalAmount = selectedRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalCurrency = selectedCurrencies[0] ?? null;

  function toggle(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function handleGenerate() {
    if (!customerId || selected.size === 0 || multiCurrency) return;
    setSubmitting(true);
    try {
      const p_selection: {
        charge_ids?: string[];
        expense_ids?: string[];
        task_ids?: string[];
        project_time_ids?: string[];
        staff_time?: { project_id: string; user_id: string }[];
      } = {};
      for (const r of selectedRows) {
        if (!r.candidate_type) continue;
        switch (r.candidate_type) {
          case "charge":
            if (r.ref_id) (p_selection.charge_ids ||= []).push(r.ref_id);
            break;
          case "expense":
            if (r.ref_id) (p_selection.expense_ids ||= []).push(r.ref_id);
            break;
          case "task_time":
            if (r.ref_id) (p_selection.task_ids ||= []).push(r.ref_id);
            break;
          case "project_time":
            if (r.ref_id) (p_selection.project_time_ids ||= []).push(r.ref_id);
            break;
          case "staff_time":
            if (r.project_id && r.ref_user_id) {
              (p_selection.staff_time ||= []).push({
                project_id: r.project_id,
                user_id: r.ref_user_id,
              });
            }
            break;
        }
      }
      const { data, error } = await supabase.rpc("ops_create_invoice_from_selection", {
        p_customer: customerId,
        p_selection: p_selection as never,
      });
      if (error) throw error;
      toast.success("Draft invoice created");
      navigate(`/operations/invoices/${data}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate invoice");
    } finally {
      setSubmitting(false);
    }
  }

  const customerName = lockedCustomerQ.data?.display_name;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">New invoice from work</h1>
          <p className="text-muted-foreground text-sm">
            {customerName
              ? `Operations · ${customerName}`
              : "Operations · Select billable items to invoice"}
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={!customerId || selected.size === 0 || multiCurrency || submitting}
        >
          {submitting ? "Generating…" : "Generate invoice"}
        </Button>
      </div>

      {!lockedCustomerId && (
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={pickedCustomerId}
              onValueChange={(v) => {
                setPickedCustomerId(v);
                setSelected(new Set());
              }}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a customer…" />
              </SelectTrigger>
              <SelectContent>
                {(customersQ.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {customerId && (
        <>
          {candidatesQ.isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-sm">Loading…</p>
              </CardContent>
            </Card>
          ) : candidatesQ.error ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-destructive text-sm">
                  {(candidatesQ.error as Error).message}
                </p>
              </CardContent>
            </Card>
          ) : candidates.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-sm">
                  No unbilled work for this customer.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {groups.map((group) => (
                <Card key={group.project_id ?? "__none__"}>
                  <CardHeader>
                    <CardTitle>{group.project_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.rows.map((r) => {
                      const key = r.candidate_key ?? "";
                      const isStaff = r.candidate_type === "staff_time";
                      const noRate = isStaff && r.amount === null;
                      const checked = !!key && selected.has(key);
                      return (
                        <div
                          key={key}
                          className="flex items-start justify-between gap-4 rounded-md border p-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Checkbox
                              checked={checked}
                              disabled={noRate || !key}
                              onCheckedChange={(c) => key && toggle(key, !!c)}
                              className="mt-1"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{r.label ?? "—"}</p>
                              {noRate && (
                                <p className="text-xs text-muted-foreground">
                                  Set a billing rate to invoice this
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm shrink-0">
                            {r.quantity != null && r.unit ? (
                              <p className="text-muted-foreground">
                                {r.quantity} {r.unit}
                              </p>
                            ) : r.quantity != null ? (
                              <p className="text-muted-foreground">{r.quantity}</p>
                            ) : null}
                            <p className="font-medium">
                              {r.amount === null ? "—" : formatMoney(r.amount, r.currency_code)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardContent className="p-6 space-y-2">
                  {multiCurrency && (
                    <p className="text-sm text-destructive">
                      Selected items span multiple currencies ({selectedCurrencies.join(", ")}).
                      Pick items in a single currency to generate an invoice.
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selected.size} item{selected.size === 1 ? "" : "s"} selected
                    </p>
                    <p className="text-lg font-semibold">
                      {totalCurrency ? formatMoney(totalAmount, totalCurrency) : formatMoney(0, null)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
