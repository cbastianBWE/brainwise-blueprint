import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

type EntityKey = "customers" | "items";

type TargetField = { key: string; label: string; required?: boolean };

const CUSTOMER_FIELDS: TargetField[] = [
  { key: "display_name", label: "Display name", required: true },
  { key: "legal_name", label: "Legal name" },
  { key: "type", label: "Type" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "tax_id", label: "Tax ID" },
  { key: "default_currency_code", label: "Default currency code" },
  { key: "default_payment_terms_days", label: "Default payment terms (days)" },
  { key: "language_code", label: "Language code" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
  { key: "billing_line1", label: "Billing line 1" },
  { key: "billing_line2", label: "Billing line 2" },
  { key: "billing_city", label: "Billing city" },
  { key: "billing_state", label: "Billing state" },
  { key: "billing_postal_code", label: "Billing postal code" },
  { key: "billing_country", label: "Billing country" },
];

const ITEM_FIELDS: TargetField[] = [
  { key: "name", label: "Name", required: true },
  { key: "sku", label: "SKU" },
  { key: "description", label: "Description" },
  { key: "type", label: "Type" },
  { key: "default_selling_price", label: "Default selling price" },
  { key: "default_cost_price", label: "Default cost price" },
  { key: "status", label: "Status" },
];

const FIELDS: Record<EntityKey, TargetField[]> = {
  customers: CUSTOMER_FIELDS,
  items: ITEM_FIELDS,
};

// Future: per-entity named presets that auto-fill the column mapping.
// e.g. PRESETS.customers["zoho"] = { label: "Zoho Books", mapping: { display_name: "Display Name", ... } }
const PRESETS: Record<EntityKey, Record<string, { label: string; mapping: Record<string, string> }>> = {
  customers: {},
  items: {},
};

const NONE = "__none__";

type PreviewRow = {
  index: number;
  action: "insert" | "update" | "skip" | "error" | string;
  name?: string | null;
  messages?: string[] | null;
};

type PreviewResult = {
  mode: string;
  on_conflict: string;
  total: number;
  counts: { insert: number; update: number; skip: number; error: number };
  rows: PreviewRow[];
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function actionVariant(action: string): "default" | "secondary" | "outline" | "destructive" {
  switch (action) {
    case "insert": return "default";
    case "update": return "secondary";
    case "skip": return "outline";
    case "error": return "destructive";
    default: return "outline";
  }
}

export default function OperationsImport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const entityParam = (searchParams.get("entity") as EntityKey) || "customers";
  const entity: EntityKey = entityParam === "items" ? "items" : "customers";

  const [preset, setPreset] = useState<string>("__generic__");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [onConflict, setOnConflict] = useState<"skip" | "update">("skip");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fields = FIELDS[entity];
  const presetOptions = useMemo(() => {
    const named = Object.entries(PRESETS[entity] ?? {}).map(([k, v]) => ({ value: k, label: v.label }));
    return [{ value: "__generic__", label: "Generic (manual)" }, ...named];
  }, [entity]);

  const requiredField = fields.find((f) => f.required);
  const requiredMapped = requiredField ? !!mapping[requiredField.key] : true;
  const canPreview = !!file && rows.length > 0 && requiredMapped && !submitting;
  const canCommit = !!preview && !submitting && requiredMapped;

  const resetAll = () => {
    setFile(null);
    setRows([]);
    setHeaders([]);
    setMapping({});
    setPreview(null);
  };

  const handleEntityChange = (v: string) => {
    setSearchParams({ entity: v });
    setPreset("__generic__");
    resetAll();
  };

  const autoMap = (detected: string[], target: TargetField[]): Record<string, string> => {
    const norm = detected.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
    const out: Record<string, string> = {};
    for (const t of target) {
      const tn = t.key.toLowerCase();
      const found = norm.find((h) => h.norm === tn);
      if (found) out[t.key] = found.raw;
    }
    return out;
  };

  const handleFile = (f: File | null) => {
    setFile(f);
    setRows([]);
    setHeaders([]);
    setMapping({});
    setPreview(null);
    if (!f) return;
    Papa.parse<Record<string, any>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const detected = (res.meta.fields ?? []).filter((h): h is string => !!h);
        const data = (res.data ?? []) as Record<string, any>[];
        setHeaders(detected);
        setRows(data);
        setMapping(autoMap(detected, fields));
      },
      error: (err) => {
        toast({ title: "Failed to parse CSV", description: err.message, variant: "destructive" });
      },
    });
  };

  const handlePresetChange = (v: string) => {
    setPreset(v);
    if (v === "__generic__") return;
    const p = PRESETS[entity][v];
    if (p) setMapping({ ...p.mapping });
  };

  const buildPayload = (): any[] => {
    return rows.map((r) => {
      const out: Record<string, any> = {};
      for (const f of fields) {
        const h = mapping[f.key];
        if (!h || h === NONE) continue;
        const v = r[h];
        if (v === undefined) continue;
        out[f.key] = v === "" ? null : v;
      }
      return out;
    });
  };

  const runImport = async (mode: "dry_run" | "commit") => {
    const rpcName = entity === "customers" ? "ops_import_customers" : "ops_import_items";
    const p_rows = buildPayload();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(rpcName as any, {
        p_rows,
        p_mode: mode,
        p_on_conflict: onConflict,
      } as any);
      if (error) throw error;
      const result = data as unknown as PreviewResult;
      setPreview(result);
      if (mode === "commit") {
        const c = result?.counts ?? { insert: 0, update: 0, skip: 0, error: 0 };
        toast({
          title: "Import complete",
          description: `Inserted ${c.insert}, updated ${c.update}, skipped ${c.skip}, errors ${c.error}.`,
        });
      }
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const errorCount = preview?.counts.error ?? 0;
  const backTo = entity === "items" ? "/operations/items" : "/operations/customers";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(backTo)} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-semibold">Import CSV</h1>
          <p className="text-muted-foreground text-sm">Operations · Bulk import {entity}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Entity &amp; preset</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entity} onValueChange={handleEntityChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="items">Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mapping preset</Label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {presetOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Upload CSV</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="text-sm text-muted-foreground">
              {file.name} — {rows.length} row{rows.length === 1 ? "" : "s"} detected ({headers.length} columns)
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Choose a .csv file with a header row.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>3. Column mapping</CardTitle></CardHeader>
        <CardContent>
          {headers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload a CSV to map columns.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {fields.map((f) => (
                <div key={f.key} className="grid grid-cols-2 items-center gap-3">
                  <Label className="text-sm">
                    {f.label}
                    {f.required ? <span className="text-destructive ml-1">*</span> : null}
                    <span className="block text-xs text-muted-foreground font-normal">{f.key}</span>
                  </Label>
                  <Select
                    value={mapping[f.key] ?? NONE}
                    onValueChange={(v) =>
                      setMapping((m) => {
                        const next = { ...m };
                        if (v === NONE) delete next[f.key];
                        else next[f.key] = v;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— none —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>4. Conflict handling</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label>On conflict</Label>
            <Select value={onConflict} onValueChange={(v) => setOnConflict(v as "skip" | "update")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip existing</SelectItem>
                <SelectItem value="update">Update existing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>5. Preview &amp; import</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => runImport("dry_run")} disabled={!canPreview}>
              {submitting ? "Working…" : "Preview"}
            </Button>
            <Button
              variant="default"
              onClick={() => runImport("commit")}
              disabled={!canCommit}
            >
              {submitting ? "Working…" : "Import"}
            </Button>
            {!requiredMapped && requiredField ? (
              <span className="text-xs text-muted-foreground">
                Map the required field ({requiredField.label}) to enable Preview.
              </span>
            ) : null}
            {preview && errorCount > 0 ? (
              <span className="text-xs text-destructive">
                {errorCount} row{errorCount === 1 ? "" : "s"} will be skipped due to errors.
              </span>
            ) : null}
          </div>

          {preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">Total: {preview.total}</Badge>
                <Badge>Insert: {preview.counts.insert}</Badge>
                <Badge variant="secondary">Update: {preview.counts.update}</Badge>
                <Badge variant="outline">Skip: {preview.counts.skip}</Badge>
                <Badge variant="destructive">Error: {preview.counts.error}</Badge>
                <Badge variant="outline" className="capitalize">Mode: {preview.mode}</Badge>
              </div>
              <div className="max-h-96 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="w-28">Action</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Messages</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(preview.rows ?? []).map((r) => (
                      <TableRow key={r.index}>
                        <TableCell>{r.index}</TableCell>
                        <TableCell>
                          <Badge variant={actionVariant(r.action)} className="capitalize">
                            {r.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.name ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(r.messages ?? []).join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
