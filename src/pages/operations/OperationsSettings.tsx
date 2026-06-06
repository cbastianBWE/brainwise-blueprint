import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };

export default function OperationsSettings() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    legal_name: "", email: "", phone: "", website: "", tax_id: "",
    brand_color: "#021F36", accent_color: "#F5741A", logo_url: "",
    address: {} as Address,
  });

  const orgQ = useQuery({
    queryKey: ["ops", "org-branding"],
    queryFn: async () => {
      const { data, error } = await opsSupabase.from("organizations" as any).select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const o = orgQ.data as any;
    if (!o) return;
    setForm({
      legal_name: o.legal_name ?? o.name ?? "",
      email: o.email ?? "",
      phone: o.phone ?? "",
      website: o.website ?? "",
      tax_id: o.tax_id ?? "",
      brand_color: o.brand_color ?? "#021F36",
      accent_color: o.accent_color ?? "#F5741A",
      logo_url: o.logo_url ?? "",
      address: (o.address ?? {}) as Address,
    });
  }, [orgQ.data]);

  const setField = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: any) => setForm((f: any) => ({ ...f, address: { ...f.address, [k]: v } }));

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const org = orgQ.data as any;
    if (!file || !org?.id) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${org.id}/logo-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("operations-branding").upload(path, file, { upsert: true, contentType: file.type });

      if (up.error) { toast.error(up.error.message ?? "Logo upload failed"); return; }
      const pub = opsSupabase.storage.from("operations-branding").getPublicUrl(path);
      setField("logo_url", pub.data.publicUrl);
      toast.success("Logo uploaded. Remember to Save.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const p_patch = {
        legal_name: form.legal_name || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        tax_id: form.tax_id || null,
        brand_color: form.brand_color || null,
        accent_color: form.accent_color || null,
        logo_url: form.logo_url || null,
        address: form.address ?? {},
      };
      const { error } = await supabase.rpc("ops_update_org_branding" as any, { p_patch });
      if (error) { toast.error(error.message ?? "Save failed"); return; }
      toast.success("Branding saved.");
      qc.invalidateQueries({ queryKey: ["ops", "org-branding"] });
    } finally {
      setSaving(false);
    }
  }

  if (orgQ.isLoading) return <div className="p-6 text-muted-foreground text-sm">Loading…</div>;

  const field = (label: string, key: string, type: string = "text") => (
    <div className="space-y-2">
      <Label htmlFor={`f-${key}`}>{label}</Label>
      <Input id={`f-${key}`} type={type} value={(form as any)[key] ?? ""} onChange={(e) => setField(key, e.target.value)} />
    </div>
  );
  const addrField = (label: string, key: keyof Address) => (
    <div className="space-y-2">
      <Label htmlFor={`a-${key}`}>{label}</Label>
      <Input id={`a-${key}`} value={(form.address as any)[key] ?? ""} onChange={(e) => setAddr(key, e.target.value)} />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-16 w-auto object-contain rounded border" />
            ) : (
              <p className="text-muted-foreground text-sm">No logo uploaded.</p>
            )}
            <Input type="file" accept="image/png,image/jpeg" onChange={handleLogo} disabled={uploading} />
            <p className="text-muted-foreground text-xs">
              PNG or JPEG. Uploaded to public branding storage and embedded on documents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Legal name", "legal_name")}
            {field("Tax ID", "tax_id")}
            {field("Email", "email", "email")}
            {field("Phone", "phone")}
            {field("Website", "website")}
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addrField("Address line 1", "line1")}
              {addrField("Address line 2", "line2")}
              {addrField("City", "city")}
              {addrField("State / Region", "state")}
              {addrField("Postal code", "postal_code")}
              {addrField("Country", "country")}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand_color">Brand color (primary)</Label>
              <div className="flex items-center gap-2">
                <Input id="brand_color" type="color" value={form.brand_color} onChange={(e) => setField("brand_color", e.target.value)} className="h-10 w-16 p-1" />
                <Input value={form.brand_color} onChange={(e) => setField("brand_color", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent color</Label>
              <div className="flex items-center gap-2">
                <Input id="accent_color" type="color" value={form.accent_color} onChange={(e) => setField("accent_color", e.target.value)} className="h-10 w-16 p-1" />
                <Input value={form.accent_color} onChange={(e) => setField("accent_color", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save branding"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
