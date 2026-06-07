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

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  title: string;
  account_id: string;
};

const empty = (): FormState => ({
  first_name: "", last_name: "", email: "", phone: "", title: "", account_id: "",
});

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const NONE = "__none__";

export default function ContactCrmFormDialog({ open, onOpenChange, row }: Props) {
  const isEdit = !!row;
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty());
  const [submitting, setSubmitting] = useState(false);

  const accountsQ = useQuery({
    queryKey: ["ops", "accounts", "select"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("accounts" as any)
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (open) {
      setForm(row ? {
        first_name: row.first_name ?? "",
        last_name: row.last_name ?? "",
        email: row.email ?? "",
        phone: row.phone ?? "",
        title: row.title ?? "",
        account_id: row.account_id ?? "",
      } : empty());
    }
  }, [open, row]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload: Record<string, unknown> = {};
    if (form.first_name.trim()) payload.first_name = trimOrNull(form.first_name);
    if (form.last_name.trim()) payload.last_name = trimOrNull(form.last_name);
    if (form.email.trim()) payload.email = trimOrNull(form.email);
    if (form.phone.trim()) payload.phone = trimOrNull(form.phone);
    if (form.title.trim()) payload.title = trimOrNull(form.title);
    if (form.account_id) payload.account_id = form.account_id;

    try {
      if (isEdit) {
        const { error } = await opsSupabase.from("contact_persons" as any).update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success("Contact updated");
      } else {
        payload.created_from = "direct";
        const { error } = await opsSupabase.from("contact_persons" as any).insert(payload);
        if (error) throw error;
        toast.success("Contact created");
      }
      qc.invalidateQueries({ queryKey: ["ops", "contacts", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit contact" : "New contact"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update contact details." : "Add a new CRM contact."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select
                value={form.account_id || NONE}
                onValueChange={(v) => set("account_id", v === NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— none —</SelectItem>
                  {(accountsQ.data ?? []).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create contact"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
