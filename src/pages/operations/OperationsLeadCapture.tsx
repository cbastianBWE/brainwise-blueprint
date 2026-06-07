import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Copy, Pencil, Plus, RefreshCw, Trash2, KeyRound, Power } from "lucide-react";

type Row = {
  id: string;
  name: string;
  recipe: string;
  is_active: boolean;
  require_signature: boolean;
  auto_enrich: boolean;
  rate_limit_per_min: number;
  received_count: number;
  ingest_url: string;
  public_token: string;
};

const RECIPES = [
  { value: "generic", label: "Generic" },
  { value: "lovable_form", label: "Lovable Form" },
  { value: "tally", label: "Tally" },
  { value: "microsoft_bookings", label: "Microsoft Bookings" },
  { value: "stripe", label: "Stripe" },
  { value: "zapier", label: "Zapier" },
];

const copyToClipboard = async (text: string, label = "Copied") => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
};

export default function OperationsLeadCapture() {
  const qc = useQueryClient();
  const queryKey = ["ops", "lead-capture", "webhooks"] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ops_list_lead_capture_webhooks" as any);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cRecipe, setCRecipe] = useState("generic");
  const [cRequireSig, setCRequireSig] = useState(true);
  const [cAutoEnrich, setCAutoEnrich] = useState(false);
  const [cRate, setCRate] = useState("60");
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [eId, setEId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eRecipe, setERecipe] = useState("generic");
  const [eRequireSig, setERequireSig] = useState(true);
  const [eAutoEnrich, setEAutoEnrich] = useState(false);
  const [eRate, setERate] = useState("60");
  const [eActive, setEActive] = useState(true);

  // Reveal dialog
  const [revealOpen, setRevealOpen] = useState(false);
  const [reveal, setReveal] = useState<{ ingest_url?: string; public_token?: string; hmac_secret?: string; oneTime?: boolean } | null>(null);

  const resetCreate = () => {
    setCName(""); setCRecipe("generic"); setCRequireSig(true);
    setCAutoEnrich(false); setCRate("60");
  };

  const handleCreate = async () => {
    if (!cName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("ops_create_lead_capture_webhook" as any, {
        p_name: cName.trim(),
        p_recipe: cRecipe,
        p_options: {
          require_signature: cRequireSig,
          auto_enrich: cAutoEnrich,
          rate_limit_per_min: Number(cRate) || 60,
        },
      });
      if (error) { toast.error(error.message); return; }
      const r = (Array.isArray(data) ? data[0] : data) as any;
      toast.success("Webhook created");
      setCreateOpen(false); resetCreate();
      qc.invalidateQueries({ queryKey });
      setReveal({
        ingest_url: r?.ingest_url,
        public_token: r?.public_token,
        hmac_secret: r?.hmac_secret,
        oneTime: true,
      });
      setRevealOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (r: Row) => {
    setEId(r.id);
    setEName(r.name);
    setERecipe(r.recipe);
    setERequireSig(r.require_signature);
    setEAutoEnrich(r.auto_enrich);
    setERate(String(r.rate_limit_per_min));
    setEActive(r.is_active);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!eId) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("ops_update_lead_capture_webhook" as any, {
        p_id: eId,
        p_patch: {
          name: eName.trim(),
          recipe: eRecipe,
          require_signature: eRequireSig,
          auto_enrich: eAutoEnrich,
          rate_limit_per_min: Number(eRate) || 60,
          is_active: eActive,
        },
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Webhook updated");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (r: Row) => {
    const { error } = await supabase.rpc("ops_update_lead_capture_webhook" as any, {
      p_id: r.id,
      p_patch: { is_active: !r.is_active },
    });
    if (error) { toast.error(error.message); return; }
    toast.success(r.is_active ? "Deactivated" : "Activated");
    qc.invalidateQueries({ queryKey });
  };

  const handleShowSigning = async (r: Row) => {
    const { data, error } = await supabase.rpc("ops_get_webhook_signing_info" as any, { p_id: r.id });
    if (error) { toast.error(error.message); return; }
    const info = (Array.isArray(data) ? data[0] : data) as any;
    setReveal({
      ingest_url: info?.ingest_url,
      public_token: info?.public_token,
      hmac_secret: info?.hmac_secret,
      oneTime: false,
    });
    setRevealOpen(true);
  };

  const handleRotate = async (r: Row) => {
    if (!window.confirm("Rotate signing secret? The old secret will stop working immediately.")) return;
    const { data, error } = await supabase.rpc("ops_rotate_webhook_secret" as any, { p_id: r.id });
    if (error) { toast.error(error.message); return; }
    const info = (Array.isArray(data) ? data[0] : data) as any;
    toast.success("Secret rotated");
    setReveal({
      ingest_url: info?.ingest_url ?? r.ingest_url,
      public_token: info?.public_token ?? r.public_token,
      hmac_secret: info?.hmac_secret,
      oneTime: true,
    });
    setRevealOpen(true);
    qc.invalidateQueries({ queryKey });
  };

  const handleDelete = async (r: Row) => {
    if (!window.confirm(`Delete webhook "${r.name}"?`)) return;
    const { error } = await supabase.rpc("ops_delete_lead_capture_webhook" as any, { p_id: r.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Webhook deleted");
    qc.invalidateQueries({ queryKey });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lead capture</h1>
          <p className="text-muted-foreground text-sm">CRM · Inbound webhooks for lead capture</p>
        </div>
        <Button onClick={() => { resetCreate(); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add webhook
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Webhooks</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No webhooks yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Auto-enrich</TableHead>
                  <TableHead>Rate/min</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Ingest URL</TableHead>
                  <TableHead className="w-44 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.recipe}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.auto_enrich ? "Yes" : "No"}</TableCell>
                    <TableCell>{r.rate_limit_per_min}</TableCell>
                    <TableCell>{r.received_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[280px]">
                        <code className="text-xs truncate">{r.ingest_url}</code>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(r.ingest_url, "Ingest URL copied")}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={r.is_active ? "Deactivate" : "Activate"} onClick={() => handleToggleActive(r)}>
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Signing info" onClick={() => handleShowSigning(r)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Rotate secret" onClick={() => handleRotate(r)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Delete" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>How signature verification works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            When <strong>Require signature</strong> is on, the ingest endpoint expects an
            <code className="mx-1">X-Signature</code> header containing the HMAC-SHA256 of the
            raw request body computed with the webhook's signing secret, encoded as hex.
          </p>
          <p>
            For providers that sign with their own scheme (Stripe, Tally, Microsoft Bookings, Zapier),
            turn <strong>Require signature</strong> off and rely on the unguessable token embedded in
            the ingest URL.
          </p>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreate(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Recipe</Label>
              <Select value={cRecipe} onValueChange={setCRecipe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECIPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Require signature</Label>
              <Switch checked={cRequireSig} onCheckedChange={setCRequireSig} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-enrich</Label>
              <Switch checked={cAutoEnrich} onCheckedChange={setCAutoEnrich} />
            </div>
            <div className="space-y-2">
              <Label>Rate limit per minute</Label>
              <Input type="number" min={1} value={cRate} onChange={(e) => setCRate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Recipe</Label>
              <Select value={eRecipe} onValueChange={setERecipe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECIPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={eActive} onCheckedChange={setEActive} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Require signature</Label>
              <Switch checked={eRequireSig} onCheckedChange={setERequireSig} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-enrich</Label>
              <Switch checked={eAutoEnrich} onCheckedChange={setEAutoEnrich} />
            </div>
            <div className="space-y-2">
              <Label>Rate limit per minute</Label>
              <Input type="number" min={1} value={eRate} onChange={(e) => setERate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal dialog */}
      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook credentials</DialogTitle>
            {reveal?.oneTime && (
              <DialogDescription className="text-destructive">
                The signing secret is shown only once. Copy and store it securely now.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {reveal?.ingest_url && (
              <div className="space-y-1">
                <Label>Ingest URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={reveal.ingest_url} />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(reveal.ingest_url!, "URL copied")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {reveal?.public_token && (
              <div className="space-y-1">
                <Label>Public token</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={reveal.public_token} />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(reveal.public_token!, "Token copied")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {reveal?.hmac_secret && (
              <div className="space-y-1">
                <Label>Signing secret</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={reveal.hmac_secret} className="font-mono" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(reveal.hmac_secret!, "Secret copied")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
