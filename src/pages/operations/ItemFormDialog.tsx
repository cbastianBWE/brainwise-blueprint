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

export type ItemRecord = {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  type?: string | null;
  default_selling_price?: number | null;
  default_cost_price?: number | null;
  stripe_tax_code?: string | null;
  status?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ItemRecord | null;
};

type FormState = {
  name: string;
  sku: string;
  description: string;
  type: "goods" | "services";
  default_selling_price: string;
  default_cost_price: string;
  stripe_tax_code: string;
  status: "active" | "inactive";
};

const emptyState = (): FormState => ({
  name: "",
  sku: "",
  description: "",
  type: "services",
  default_selling_price: "",
  default_cost_price: "",
  stripe_tax_code: "",
  status: "active",
});

const fromItem = (i: ItemRecord): FormState => ({
  name: i.name ?? "",
  sku: i.sku ?? "",
  description: i.description ?? "",
  type: i.type === "goods" ? "goods" : "services",
  default_selling_price:
    i.default_selling_price === null || i.default_selling_price === undefined
      ? ""
      : String(i.default_selling_price),
  default_cost_price:
    i.default_cost_price === null || i.default_cost_price === undefined
      ? ""
      : String(i.default_cost_price),
  stripe_tax_code: i.stripe_tax_code ?? "",
  status: i.status === "inactive" ? "inactive" : "active",
});

const trimOrNull = (v: string) => {
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export default function ItemFormDialog({ open, onOpenChange, item }: Props) {
  const isEdit = !!item;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(item ? fromItem(item) : emptyState());
      setError(null);
    }
  }, [open, item]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      sku: trimOrNull(form.sku),
      description: trimOrNull(form.description),
      type: form.type,
      default_selling_price: numOrNull(form.default_selling_price),
      default_cost_price: numOrNull(form.default_cost_price),
      stripe_tax_code: trimOrNull(form.stripe_tax_code),
      status: form.status,
    };

    try {
      if (isEdit && item) {
        const { error } = await opsSupabase
          .from("items")
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
        toast.success("Item updated");
      } else {
        const { error } = await opsSupabase.from("items").insert(payload);
        if (error) throw error;
        toast.success("Item created");
      }
      queryClient.invalidateQueries({ queryKey: ["ops", "items", "list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update item details." : "Add a new item to the catalog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as FormState["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="goods">Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling">Default selling price</Label>
              <Input
                id="selling"
                type="number"
                step="0.01"
                value={form.default_selling_price}
                onChange={(e) => set("default_selling_price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Default cost price</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={form.default_cost_price}
                onChange={(e) => set("default_cost_price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_code">Stripe tax code</Label>
              <Input
                id="tax_code"
                value={form.stripe_tax_code}
                onChange={(e) => set("stripe_tax_code", e.target.value)}
              />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
