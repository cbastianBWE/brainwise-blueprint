import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opsSupabase } from "@/integrations/supabase/operations-types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATE_TYPES = [
  "invoice_send","estimate_send","payment_receipt",
  "reminder_before_due","reminder_on_due","reminder_after_due",
  "recurring_notice","retainer_send","statement_send","credit_note_send",
] as const;

function titleCase(s: string) {
  return s.split("_").map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
}
function humanizeType(t: string) {
  if (t === "reminder_before_due") return "Reminder — before due";
  if (t === "reminder_on_due") return "Reminder — on due";
  if (t === "reminder_after_due") return "Reminder — after due";
  return titleCase(t);
}
function humanizeToken(token: string): string {
  const map: Record<string, string> = {
    customer_name: "Customer Name",
    org_name: "BrainWise Enterprises",
    invoice_number: "INV-2026-0008",
    estimate_number: "EST-2026-0008",
    credit_note_number: "CN-2026-0008",
    statement_number: "STM-2026-0008",
    balance_due: "1,500.00",
    total_amount: "1,500.00",
    amount: "1,500.00",
    amount_due: "1,500.00",
    subtotal: "1,500.00",
    tax_total: "1,500.00",
  };
  if (map[token]) return map[token];
  if (/_date$/.test(token)) return "2026-06-15";
  if (/_(link|url)$/.test(token)) return "https://example.com/pay";
  return titleCase(token);
}
function applyTokens(str: string, ctx: Record<string, string>) {
  return (str ?? "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, t) => ctx[t] ?? "");
}
function formatTiming(n: number) {
  if (n < 0) return `${Math.abs(n)} days before due`;
  if (n === 0) return "On due date";
  return `${n} days after due`;
}

type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };

function PlaceholderCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Available in an upcoming update.</p>
      </CardContent>
    </Card>
  );
}

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
      const pub = supabase.storage.from("operations-branding").getPublicUrl(path);
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

  // ---------- Numbering & Tax queries ----------
  const numberingQ = useQuery({
    queryKey: ["ops", "settings", "numbering"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_numbering_schemes" as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const authoritiesQ = useQuery({
    queryKey: ["ops", "settings", "tax-authorities"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_tax_authorities" as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const ratesQ = useQuery({
    queryKey: ["ops", "settings", "tax-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_tax_rates" as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const currenciesQ = useQuery({
    queryKey: ["ops", "settings", "currencies"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_currencies" as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // ---------- Numbering edit ----------
  const [schemeDraft, setSchemeDraft] = useState<any | null>(null);
  async function saveScheme() {
    if (!schemeDraft) return;
    const { error } = await supabase.rpc("ops_update_numbering_scheme" as any, {
      p_id: schemeDraft.id,
      p_patch: {
        prefix: schemeDraft.prefix ?? "",
        padding_zeros: Number(schemeDraft.padding_zeros ?? 0),
        reset_frequency: schemeDraft.reset_frequency ?? "never",
      },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Numbering scheme updated.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "numbering"] });
    setSchemeDraft(null);
  }

  // ---------- Tax authority dialog ----------
  const [authorityDraft, setAuthorityDraft] = useState<any | null>(null);
  async function saveAuthority() {
    if (!authorityDraft) return;
    if (!authorityDraft.name) { toast.error("Name is required"); return; }
    const { error } = await supabase.rpc("ops_upsert_tax_authority" as any, {
      p_id: authorityDraft.id ?? null,
      p_patch: {
        name: authorityDraft.name,
        jurisdiction: authorityDraft.jurisdiction ?? null,
        tax_id: authorityDraft.tax_id ?? null,
      },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "tax-authorities"] });
    setAuthorityDraft(null);
  }
  async function deleteAuthority(id: string) {
    if (!window.confirm("Delete this tax authority?")) return;
    const { error } = await supabase.rpc("ops_delete_tax_authority" as any, { p_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "tax-authorities"] });
  }

  // ---------- Tax rate dialog ----------
  const [rateDraft, setRateDraft] = useState<any | null>(null);
  async function saveRate() {
    if (!rateDraft) return;
    if (!rateDraft.name) { toast.error("Name is required"); return; }
    const { error } = await supabase.rpc("ops_upsert_tax_rate" as any, {
      p_id: rateDraft.id ?? null,
      p_patch: {
        name: rateDraft.name,
        rate_percentage: Number(rateDraft.rate_percentage ?? 0),
        tax_authority_id:
          rateDraft.tax_authority_id && rateDraft.tax_authority_id !== "__none__"
            ? rateDraft.tax_authority_id
            : null,
        is_compound: !!rateDraft.is_compound,
        is_active: rateDraft.is_active !== false,
      },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "tax-rates"] });
    setRateDraft(null);
  }
  async function deleteRate(id: string) {
    if (!window.confirm("Delete this tax rate?")) return;
    const { error } = await supabase.rpc("ops_delete_tax_rate" as any, { p_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "tax-rates"] });
  }

  // ---------- Currency dialog ----------
  const [currencyDraft, setCurrencyDraft] = useState<any | null>(null);
  async function saveCurrency() {
    if (!currencyDraft) return;
    if (!currencyDraft.currency_code) { toast.error("Currency code is required"); return; }
    const mer = currencyDraft.manual_exchange_rate;
    const { error } = await supabase.rpc("ops_upsert_currency" as any, {
      p_id: currencyDraft.id ?? null,
      p_patch: {
        currency_code: String(currencyDraft.currency_code).toUpperCase(),
        is_base: !!currencyDraft.is_base,
        manual_exchange_rate: mer === "" || mer == null ? null : Number(mer),
      },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "currencies"] });
    setCurrencyDraft(null);
  }

  // ---------- Templates & Reminders ----------
  const templatesQ = useQuery({
    queryKey: ["ops", "settings", "email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_email_templates" as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const catalogQ = useQuery({
    queryKey: ["ops", "settings", "merge-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_get_merge_tag_catalog" as any);
      if (error) throw error;
      return (data ?? {}) as Record<string, string[]>;
    },
  });
  const schedulesQ = useQuery({
    queryKey: ["ops", "settings", "reminder-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_reminder_schedules" as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [templateType, setTemplateType] = useState<string>("invoice_send");
  const [editor, setEditor] = useState<{
    id: string | null; subject: string; body_html: string; body_text: string;
    is_active: boolean; is_default: boolean;
  }>({ id: null, subject: "", body_html: "", body_text: "", is_active: true, is_default: false });
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [serverPreview, setServerPreview] = useState<{ subject: string; body_html: string } | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    const row = (templatesQ.data ?? []).find((t: any) => t.template_type === templateType);
    if (row) {
      setEditor({
        id: row.id, subject: row.subject ?? "", body_html: row.body_html ?? "",
        body_text: row.body_text ?? "", is_active: row.is_active !== false, is_default: !!row.is_default,
      });
    } else {
      setEditor({ id: null, subject: "", body_html: "", body_text: "", is_active: true, is_default: false });
    }
    setServerPreview(null);
  }, [templateType, templatesQ.data]);

  function insertToken(token: string) {
    const literal = `{{${token}}}`;
    if (activeField === "subject") {
      const el = subjectRef.current;
      const cur = editor.subject;
      const start = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? start;
      const next = cur.slice(0, start) + literal + cur.slice(end);
      setEditor(e => ({ ...e, subject: next }));
      requestAnimationFrame(() => {
        const e2 = subjectRef.current;
        if (e2) { e2.focus(); const p = start + literal.length; e2.setSelectionRange(p, p); }
      });
    } else {
      const el = bodyRef.current;
      const cur = editor.body_html;
      const start = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? start;
      const next = cur.slice(0, start) + literal + cur.slice(end);
      setEditor(e => ({ ...e, body_html: next }));
      requestAnimationFrame(() => {
        const e2 = bodyRef.current;
        if (e2) { e2.focus(); const p = start + literal.length; e2.setSelectionRange(p, p); }
      });
    }
  }

  async function saveTemplate() {
    setSavingTemplate(true);
    try {
      const { error } = await supabase.rpc("ops_upsert_email_template" as any, {
        p_id: editor.id,
        p_patch: {
          template_type: templateType,
          subject: editor.subject,
          body_html: editor.body_html,
          body_text: editor.body_text || null,
          is_default: editor.is_default,
          is_active: editor.is_active,
        },
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Template saved.");
      setServerPreview(null);
      qc.invalidateQueries({ queryKey: ["ops", "settings", "email-templates"] });
    } finally { setSavingTemplate(false); }
  }

  async function verifyServerRender() {
    const tokens = catalogQ.data?.[templateType] ?? [];
    const ctx: Record<string, string> = {};
    for (const t of tokens) ctx[t] = humanizeToken(t);
    const { data, error } = await supabase.rpc("ops_render_email_preview" as any, {
      p_template_type: templateType, p_context: ctx,
    });
    if (error) { toast.error(error.message); return; }
    setServerPreview({ subject: (data as any)?.subject ?? "", body_html: (data as any)?.body_html ?? "" });
  }

  const [scheduleDraft, setScheduleDraft] = useState<any | null>(null);
  async function saveSchedule() {
    if (!scheduleDraft) return;
    if (!scheduleDraft.name) { toast.error("Name is required"); return; }
    const sel = scheduleDraft.template_id;
    const { error } = await supabase.rpc("ops_upsert_reminder_schedule" as any, {
      p_id: scheduleDraft.id ?? null,
      p_patch: {
        name: scheduleDraft.name,
        schedule_offset_days: Number(scheduleDraft.schedule_offset_days ?? 0),
        template_id: !sel || sel === "__auto__" ? null : sel,
        is_active: scheduleDraft.is_active !== false,
        applies_to_overdue_only: !!scheduleDraft.applies_to_overdue_only,
      },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "reminder-schedules"] });
    setScheduleDraft(null);
  }
  async function deleteSchedule(id: string) {
    if (!window.confirm("Delete this schedule?")) return;
    const { error } = await supabase.rpc("ops_delete_reminder_schedule" as any, { p_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted.");
    qc.invalidateQueries({ queryKey: ["ops", "settings", "reminder-schedules"] });
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

  const authorityNameById = (id: string | null | undefined) =>
    (authoritiesQ.data ?? []).find((a: any) => a.id === id)?.name ?? "";

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="templates">Templates & Reminders</TabsTrigger>
          <TabsTrigger value="late_fees">Late Fees</TabsTrigger>
          <TabsTrigger value="sales">Sales & Commission</TabsTrigger>
          <TabsTrigger value="custom_fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="numbering">Numbering & Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Card 1: Email templates */}
          <Card>
            <CardHeader><CardTitle>Email templates</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template type</Label>
                    <Select value={templateType} onValueChange={setTemplateType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{humanizeType(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Merge tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {(catalogQ.data?.[templateType] ?? []).map((tok) => (
                        <Button key={tok} type="button" variant="outline" size="sm" onClick={() => insertToken(tok)}>
                          {`{{${tok}}}`}
                        </Button>
                      ))}
                      {(catalogQ.data?.[templateType] ?? []).length === 0 && (
                        <p className="text-xs text-muted-foreground">No merge tags for this type.</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Click a tag to insert it at the cursor of the last-focused field (subject or body).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tpl-subject">Subject</Label>
                    <Input
                      id="tpl-subject"
                      ref={subjectRef}
                      value={editor.subject}
                      onFocus={() => setActiveField("subject")}
                      onChange={(e) => setEditor(s => ({ ...s, subject: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tpl-body">Body (HTML)</Label>
                    <Textarea
                      id="tpl-body"
                      ref={bodyRef}
                      rows={16}
                      className="font-mono text-sm"
                      value={editor.body_html}
                      onFocus={() => setActiveField("body")}
                      onChange={(e) => setEditor(s => ({ ...s, body_html: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tpl-text">Plain-text fallback (optional)</Label>
                    <Textarea
                      id="tpl-text"
                      rows={3}
                      value={editor.body_text}
                      onChange={(e) => setEditor(s => ({ ...s, body_text: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="tpl-active">Active</Label>
                    <Switch id="tpl-active" checked={editor.is_active} onCheckedChange={(v) => setEditor(s => ({ ...s, is_active: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tpl-default">Default</Label>
                    <Switch id="tpl-default" checked={editor.is_default} onCheckedChange={(v) => setEditor(s => ({ ...s, is_default: v }))} />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveTemplate} disabled={savingTemplate}>
                      {savingTemplate ? "Saving…" : "Save template"}
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                {(() => {
                  const tokens = catalogQ.data?.[templateType] ?? [];
                  const ctx: Record<string, string> = {};
                  for (const t of tokens) ctx[t] = humanizeToken(t);
                  const renderedSubject = serverPreview ? serverPreview.subject : applyTokens(editor.subject, ctx);
                  const renderedBody = serverPreview ? serverPreview.body_html : applyTokens(editor.body_html, ctx);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {serverPreview ? "Server-rendered (saved template)" : "Live preview (current edits)"}
                        </p>
                        <div className="space-x-2">
                          {serverPreview && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setServerPreview(null)}>Back to live</Button>
                          )}
                          <Button type="button" variant="outline" size="sm" onClick={verifyServerRender}>Verify server render</Button>
                        </div>
                      </div>
                      <div className="space-y-1 rounded border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Subject</p>
                        <p className="text-sm break-words">{renderedSubject || <span className="text-muted-foreground italic">(empty)</span>}</p>
                      </div>
                      <iframe
                        title="Email preview"
                        sandbox=""
                        srcDoc={renderedBody}
                        className="w-full h-[400px] border rounded bg-background"
                      />
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Reminder schedules */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reminder schedules</CardTitle>
              <Button size="sm" onClick={() => setScheduleDraft({ name: "", schedule_offset_days: 0, template_id: "__auto__", is_active: true, applies_to_overdue_only: false })}>Add schedule</Button>
            </CardHeader>
            <CardContent>
              {schedulesQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Timing</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Overdue-only</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(schedulesQ.data ?? []).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{formatTiming(Number(s.schedule_offset_days ?? 0))}</TableCell>
                        <TableCell>{s.template_id == null ? "Auto (by due state)" : humanizeType(s.template_type)}</TableCell>
                        <TableCell>{s.is_active ? "Yes" : "No"}</TableCell>
                        <TableCell>{s.applies_to_overdue_only ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setScheduleDraft({ ...s, template_id: s.template_id ?? "__auto__" })}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteSchedule(s.id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(schedulesQ.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No schedules.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="late_fees"><PlaceholderCard title="Late Fees" /></TabsContent>
        <TabsContent value="sales"><PlaceholderCard title="Sales & Commission" /></TabsContent>
        <TabsContent value="custom_fields"><PlaceholderCard title="Custom Fields" /></TabsContent>

        <TabsContent value="numbering" className="space-y-6">
          {/* Card A: Document numbering */}
          <Card>
            <CardHeader><CardTitle>Document numbering</CardTitle></CardHeader>
            <CardContent>
              {numberingQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document type</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Padding zeros</TableHead>
                      <TableHead>Reset frequency</TableHead>
                      <TableHead>Next number</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(numberingQ.data ?? []).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.document_type}</TableCell>
                        <TableCell>{s.prefix}</TableCell>
                        <TableCell>{s.padding_zeros}</TableCell>
                        <TableCell>{s.reset_frequency}</TableCell>
                        <TableCell>{s.next_number}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setSchemeDraft({ ...s })}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(numberingQ.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No numbering schemes.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Card B: Tax authorities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tax authorities</CardTitle>
              <Button size="sm" onClick={() => setAuthorityDraft({ name: "", jurisdiction: "", tax_id: "" })}>Add authority</Button>
            </CardHeader>
            <CardContent>
              {authoritiesQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Tax ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(authoritiesQ.data ?? []).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.name}</TableCell>
                        <TableCell>{a.jurisdiction}</TableCell>
                        <TableCell>{a.tax_id}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setAuthorityDraft({ ...a })}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteAuthority(a.id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(authoritiesQ.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No tax authorities.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Card C: Tax rates */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tax rates</CardTitle>
              <Button size="sm" onClick={() => setRateDraft({ name: "", rate_percentage: 0, tax_authority_id: "__none__", is_compound: false, is_active: true })}>Add rate</Button>
            </CardHeader>
            <CardContent>
              {ratesQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rate %</TableHead>
                      <TableHead>Authority</TableHead>
                      <TableHead>Compound</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ratesQ.data ?? []).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.rate_percentage}</TableCell>
                        <TableCell>{authorityNameById(r.tax_authority_id)}</TableCell>
                        <TableCell>{r.is_compound ? "Yes" : "No"}</TableCell>
                        <TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setRateDraft({ ...r, tax_authority_id: r.tax_authority_id ?? "__none__" })}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteRate(r.id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(ratesQ.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No tax rates.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Card D: Currencies */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Currencies</CardTitle>
              <Button size="sm" onClick={() => setCurrencyDraft({ currency_code: "", is_base: false, manual_exchange_rate: "" })}>Add currency</Button>
            </CardHeader>
            <CardContent>
              {currenciesQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency code</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Manual exchange rate</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(currenciesQ.data ?? []).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.currency_code}</TableCell>
                        <TableCell>{c.is_base ? "Yes" : "No"}</TableCell>
                        <TableCell>{c.manual_exchange_rate ?? ""}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setCurrencyDraft({ ...c, manual_exchange_rate: c.manual_exchange_rate ?? "" })}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(currenciesQ.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No currencies.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Numbering scheme edit dialog */}
      <Dialog open={!!schemeDraft} onOpenChange={(o) => !o && setSchemeDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit numbering scheme</DialogTitle></DialogHeader>
          {schemeDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document type</Label>
                <Input value={schemeDraft.document_type ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Prefix</Label>
                <Input value={schemeDraft.prefix ?? ""} onChange={(e) => setSchemeDraft({ ...schemeDraft, prefix: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Padding zeros</Label>
                <Input type="number" value={schemeDraft.padding_zeros ?? 0} onChange={(e) => setSchemeDraft({ ...schemeDraft, padding_zeros: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reset frequency</Label>
                <Select value={schemeDraft.reset_frequency ?? "never"} onValueChange={(v) => setSchemeDraft({ ...schemeDraft, reset_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">never</SelectItem>
                    <SelectItem value="yearly">yearly</SelectItem>
                    <SelectItem value="monthly">monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next number</Label>
                <Input value={schemeDraft.next_number ?? ""} disabled />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchemeDraft(null)}>Cancel</Button>
            <Button onClick={saveScheme}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax authority dialog */}
      <Dialog open={!!authorityDraft} onOpenChange={(o) => !o && setAuthorityDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{authorityDraft?.id ? "Edit tax authority" : "Add tax authority"}</DialogTitle></DialogHeader>
          {authorityDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={authorityDraft.name ?? ""} onChange={(e) => setAuthorityDraft({ ...authorityDraft, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jurisdiction</Label>
                <Input value={authorityDraft.jurisdiction ?? ""} onChange={(e) => setAuthorityDraft({ ...authorityDraft, jurisdiction: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tax ID</Label>
                <Input value={authorityDraft.tax_id ?? ""} onChange={(e) => setAuthorityDraft({ ...authorityDraft, tax_id: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthorityDraft(null)}>Cancel</Button>
            <Button onClick={saveAuthority}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax rate dialog */}
      <Dialog open={!!rateDraft} onOpenChange={(o) => !o && setRateDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{rateDraft?.id ? "Edit tax rate" : "Add tax rate"}</DialogTitle></DialogHeader>
          {rateDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={rateDraft.name ?? ""} onChange={(e) => setRateDraft({ ...rateDraft, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rate %</Label>
                <Input type="number" value={rateDraft.rate_percentage ?? 0} onChange={(e) => setRateDraft({ ...rateDraft, rate_percentage: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tax authority</Label>
                <Select value={rateDraft.tax_authority_id ?? "__none__"} onValueChange={(v) => setRateDraft({ ...rateDraft, tax_authority_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {(authoritiesQ.data ?? []).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="r-compound">Compound</Label>
                <Switch id="r-compound" checked={!!rateDraft.is_compound} onCheckedChange={(v) => setRateDraft({ ...rateDraft, is_compound: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="r-active">Active</Label>
                <Switch id="r-active" checked={rateDraft.is_active !== false} onCheckedChange={(v) => setRateDraft({ ...rateDraft, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDraft(null)}>Cancel</Button>
            <Button onClick={saveRate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Currency dialog */}
      <Dialog open={!!currencyDraft} onOpenChange={(o) => !o && setCurrencyDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{currencyDraft?.id ? "Edit currency" : "Add currency"}</DialogTitle></DialogHeader>
          {currencyDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Currency code</Label>
                <Input value={currencyDraft.currency_code ?? ""} onChange={(e) => setCurrencyDraft({ ...currencyDraft, currency_code: e.target.value })} placeholder="USD" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="c-base">Base</Label>
                <Switch id="c-base" checked={!!currencyDraft.is_base} onCheckedChange={(v) => setCurrencyDraft({ ...currencyDraft, is_base: v })} />
              </div>
              <div className="space-y-2">
                <Label>Manual exchange rate</Label>
                <Input type="number" value={currencyDraft.manual_exchange_rate ?? ""} onChange={(e) => setCurrencyDraft({ ...currencyDraft, manual_exchange_rate: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrencyDraft(null)}>Cancel</Button>
            <Button onClick={saveCurrency}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
