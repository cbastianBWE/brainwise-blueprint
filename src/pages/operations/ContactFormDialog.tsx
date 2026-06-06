import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  contact?: any | null;
  onSaved?: () => void;
};

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  salutation: string;
  is_primary: boolean;
};

const emptyState = (): FormState => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "",
  salutation: "",
  is_primary: false,
});

const fromContact = (c: any): FormState => ({
  first_name: c?.first_name ?? "",
  last_name: c?.last_name ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  role: c?.role ?? "",
  salutation: c?.salutation ?? "",
  is_primary: !!c?.is_primary,
});

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export default function ContactFormDialog({ open, onOpenChange, customerId, contact, onSaved }: Props) {
  const isEdit = !!contact?.id;
  const [form, setForm] = useState<FormState>(emptyState());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(contact ? fromContact(contact) : emptyState());
    }
  }, [open, contact]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      first_name: trimOrNull(form.first_name),
      last_name: trimOrNull(form.last_name),
      email: trimOrNull(form.email),
      phone: trimOrNull(form.phone),
      role: trimOrNull(form.role),
      salutation: trimOrNull(form.salutation),
      is_primary: form.is_primary,
    };
    try {
      if (isEdit) {
        const { error } = await supabase.rpc("ops_update_contact" as any, {
          p_id: contact.id,
          p_payload: payload,
        });
        if (error) throw error;
        toast.success("Contact updated");
      } else {
        const { error } = await supabase.rpc("ops_add_contact" as any, {
          p_customer_id: customerId,
          p_payload: payload,
        });
        if (error) throw error;
        toast.success("Contact added");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit contact" : "New contact"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update contact details." : "Add a contact person for this customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salutation">Salutation</Label>
              <Input id="salutation" value={form.salutation} onChange={(e) => set("salutation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={form.role} onChange={(e) => set("role", e.target.value)} />
            </div>
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
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_primary"
              checked={form.is_primary}
              onCheckedChange={(v) => set("is_primary", v === true)}
            />
            <Label htmlFor="is_primary" className="cursor-pointer">Primary contact</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
