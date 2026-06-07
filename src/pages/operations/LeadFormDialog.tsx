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
  salutation: string;
  first_name: string;
  last_name: string;
  company_name_text: string;
  email: string;
  phone: string;
  title: string;
  status_id: string;
  source_id: string;
};

const empty = (): FormState => ({
  salutation: "", first_name: "", last_name: "", company_name_text: "",
  email: "", phone: "", title: "", status_id: "", source_id: "",
});

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const NONE = "__none__";

export default function LeadFormDialog({ open, onOpenChange, row }: Props) {
  const isEdit = !!row;
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty());
  const [submitting, setSubmitting] = useState(false);

  const statusesQ = useQuery({
    queryKey: ["ops", "lead_statuses", "list"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("lead_statuses" as any)
        .select("id, name")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const sourcesQ = useQuery({
    queryKey: ["ops", "picklist", "lead_source"],
    queryFn: async () => {
      const { data, error } = await opsSupabase
        .from("picklist_values" as any)
        .select("id, label")
        .eq("picklist_type", "lead_source")
        .order("label");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (open) {
      setForm(row ? {
        salutation: row.salutation ?? "",
        first_name: row.first_name ?? "",
        last_name: row.last_name ?? "",
        company_name_text: row.company_name_text ?? "",
        email: row.email ?? "",
        phone: row.phone ?? "",
        title: row.title ?? "",
        status_id: row.status_id ?? "",
        source_id: row.source_id ?? "",
      } : empty());
    }
  }, [open, row]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.last_name.trim()) { toast.error("Last name is required"); return; }
    if (!form.company_name_text.trim()) { toast.error("Company is required"); return; }
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      last_name: form.last_name.trim(),
      company_name_text: form.company_name_text.trim(),
    };
    if (form.first_name.trim()) payload.first_name = form.first_name.trim();
    if (form.salutation.trim()) payload.salutation = form.salutation.trim();
    if (form.email.trim()) payload.email = trimOrNull(form.email);
    if (form.phone.trim()) payload.phone = trimOrNull(form.phone);
    if (form.title.trim()) payload.title = trimOrNull(form.title);
    if (form.status_id) payload.status_id = form.status_id;
    if (form.source_id) payload.source_id = form.source_id;

    try {
      if (isEdit) {
        const { error } = await opsSupabase.from("leads" as any).update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success("Lead updated");
      } else {
        const { error } = await opsSupabase.from("leads" as any).insert(payload);
        if (error) throw error;
        toast.success("Lead created");
      }
      qc.invalidateQueries({ queryKey: ["ops", "leads", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save lead");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lead" : "New lead"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update lead details." : "Add a new CRM lead."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salutation">Salutation</Label>
              <Input id="salutation" value={form.salutation} onChange={(e) => set("salutation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name *</Label>
              <Input id="last_name" required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name_text">Company *</Label>
              <Input id="company_name_text" required value={form.company_name_text} onChange={(e) => set("company_name_text", e.target.value)} />
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
              <Label>Status</Label>
              <Select
                value={form.status_id || NONE}
                onValueChange={(v) => set("status_id", v === NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— none —</SelectItem>
                  {(statusesQ.data ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={form.source_id || NONE}
                onValueChange={(v) => set("source_id", v === NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— none —</SelectItem>
                  {(sourcesQ.data ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create lead"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
