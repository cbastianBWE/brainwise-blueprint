import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type CustomerRecord = {
  id: string;
  display_name: string;
  type?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status?: string | null;
  default_currency_code?: string | null;
  default_payment_terms_days?: number | null;
  notes?: string | null;
  tax_id?: string | null;
  billing_address?: Record<string, unknown> | null;
  remit_bank_name?: string | null;
  remit_account_type?: string | null;
  remit_routing_number?: string | null;
  remit_account_number?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerRecord | null;
};

type FormState = {
  display_name: string;
  type: "individual" | "business";
  email: string;
  phone: string;
  website: string;
  status: "active" | "inactive";
  default_currency_code: string;
  default_payment_terms_days: string;
  notes: string;
  tax_id: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const emptyState = (): FormState => ({
  display_name: "",
  type: "business",
  email: "",
  phone: "",
  website: "",
  status: "active",
  default_currency_code: "USD",
  default_payment_terms_days: "30",
  notes: "",
  tax_id: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
});

const fromCustomer = (c: CustomerRecord): FormState => {
  const addr = (c.billing_address ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    display_name: c.display_name ?? "",
    type: (c.type === "individual" ? "individual" : "business"),
    email: c.email ?? "",
    phone: c.phone ?? "",
    website: c.website ?? "",
    status: (c.status === "inactive" ? "inactive" : "active"),
    default_currency_code: c.default_currency_code ?? "USD",
    default_payment_terms_days: String(c.default_payment_terms_days ?? 30),
    notes: c.notes ?? "",
    tax_id: c.tax_id ?? "",
    line1: str(addr.line1),
    line2: str(addr.line2),
    city: str(addr.city),
    state: str(addr.state),
    postal_code: str(addr.postal_code),
    country: str(addr.country) || "US",
  };
};

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export default function CustomerFormDialog({ open, onOpenChange, customer }: Props) {
  const isEdit = !!customer;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(customer ? fromCustomer(customer) : emptyState());
      setError(null);
    }
  }, [open, customer]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim()) {
      setError("Display name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const addrParts = {
      line1: trimOrNull(form.line1),
      line2: trimOrNull(form.line2),
      city: trimOrNull(form.city),
      state: trimOrNull(form.state),
      postal_code: trimOrNull(form.postal_code),
      country: trimOrNull(form.country),
    };
    const allAddrEmpty = Object.values(addrParts).every((v) => v === null);
    const billing_address = allAddrEmpty ? null : addrParts;

    const termsParsed = parseInt(form.default_payment_terms_days, 10);
    const payload = {
      display_name: form.display_name.trim(),
      type: form.type,
      email: trimOrNull(form.email),
      phone: trimOrNull(form.phone),
      website: trimOrNull(form.website),
      status: form.status,
      default_currency_code: form.default_currency_code.trim() || "USD",
      default_payment_terms_days: Number.isFinite(termsParsed) ? termsParsed : 30,
      notes: trimOrNull(form.notes),
      tax_id: trimOrNull(form.tax_id),
      billing_address,
    };

    try {
      if (isEdit && customer) {
        const { error } = await opsSupabase
          .from("customers")
          .update(payload)
          .eq("id", customer.id);
        if (error) throw error;
        toast.success("Customer updated");
        queryClient.invalidateQueries({ queryKey: ["ops", "customer", customer.id] });
      } else {
        const { error } = await opsSupabase.from("customers").insert(payload);
        if (error) throw error;
        toast.success("Customer created");
      }
      queryClient.invalidateQueries({ queryKey: ["ops", "customers", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update customer details." : "Add a new customer to operations."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name *</Label>
            <Input
              id="display_name"
              value={form.display_name}
              onChange={(e) => set("display_name", e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as FormState["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as FormState["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Default currency</Label>
              <Input
                id="currency"
                value={form.default_currency_code}
                onChange={(e) => set("default_currency_code", e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms">Default payment terms (days)</Label>
              <Input
                id="terms"
                type="number"
                min={0}
                value={form.default_payment_terms_days}
                onChange={(e) => set("default_payment_terms_days", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input id="tax_id" value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <h3 className="text-sm font-medium">Billing address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="line1">Address line 1</Label>
                <Input id="line1" value={form.line1} onChange={(e) => set("line1", e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="line2">Address line 2</Label>
                <Input id="line2" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Region</Label>
                <Input id="state" value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal code</Label>
                <Input id="postal_code" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
