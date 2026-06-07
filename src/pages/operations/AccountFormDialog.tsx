import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: any | null;
};

type AccountType = "customer" | "prospect" | "partner" | "vendor" | "reseller";

type FormState = {
  name: string;
  type: AccountType;
  domain: string;
  website: string;
  phone: string;
  industry_id: string;
};

const empty = (): FormState => ({
  name: "", type: "prospect", domain: "", website: "", phone: "", industry_id: "",
});

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const NONE = "__none__";

export default function AccountFormDialog({ open, onOpenChange, row }: Props) {
  const isEdit = !!row;
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty());
  const [submitting, setSubmitting] = useState(false);

  const industriesQ = useQuery({
    queryKey: ["ops", "picklist", "industry"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("picklist_values" as any)
        .select("id, label")
        .eq("picklist_type", "industry")
        .order("label");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (open) {
      setForm(row ? {
        name: row.name ?? "",
        type: (row.type as AccountType) ?? "prospect",
        domain: row.domain ?? "",
        website: row.website ?? "",
        phone: row.phone ?? "",
        industry_id: row.industry_id ?? "",
      } : empty());
    }
  }, [open, row]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
    };
    if (form.domain.trim()) payload.domain = trimOrNull(form.domain);
    if (form.website.trim()) payload.website = trimOrNull(form.website);
    if (form.phone.trim()) payload.phone = trimOrNull(form.phone);
    if (form.industry_id) payload.industry_id = form.industry_id;

    try {
      if (isEdit) {
        const { error } = await opsSupabase.from("accounts" as any).update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success("Account updated");
      } else {
        const { error } = await opsSupabase.from("accounts" as any).insert(payload);
        if (error) throw error;
        toast.success("Account created");
      }
      qc.invalidateQueries({ queryKey: ["ops", "accounts", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update account details." : "Add a new CRM account."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select
                value={form.industry_id || NONE}
                onValueChange={(v) => set("industry_id", v === NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— none —</SelectItem>
                  {(industriesQ.data ?? []).map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" value={form.domain} onChange={(e) => set("domain", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
