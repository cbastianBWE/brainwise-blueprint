import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  organizationId: string;
}

type DomainKind = "vanity" | "subdomain";

interface DomainRow {
  id: string;
  organization_id: string;
  hostname: string;
  kind: DomainKind;
  is_verified: boolean;
  is_primary: boolean;
  created_at?: string;
}

export default function CompanyDomainsSection({ organizationId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DomainRow[]>([]);

  const [hostname, setHostname] = useState("");
  const [kind, setKind] = useState<DomainKind>("vanity");
  const [isVerified, setIsVerified] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("org_custom_domains")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      toast({ title: "Could not load domains", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data as any[]) ?? []);
    }
    setLoading(false);
  }, [organizationId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const callSet = async (
    p_hostname: string,
    p_kind: DomainKind,
    p_is_verified: boolean,
    p_is_primary: boolean,
    p_reason: string,
  ) => {
    const { error } = await (supabase.rpc as any)("admin_set_org_custom_domain", {
      p_organization_id: organizationId,
      p_hostname,
      p_kind,
      p_is_verified,
      p_is_primary,
      p_reason,
    });
    return error;
  };

  const handleAdd = async () => {
    const host = hostname.trim().toLowerCase();
    if (!host) {
      toast({ title: "Hostname required", variant: "destructive" });
      return;
    }
    if (reason.trim().length < 10) {
      toast({ title: "Reason required", description: "Please provide a reason (min 10 chars).", variant: "destructive" });
      return;
    }
    setSaving(true);
    const error = await callSet(host, kind, isVerified, isPrimary, reason.trim());
    setSaving(false);
    if (error) {
      toast({ title: "Failed to add domain", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Domain saved" });
    setHostname("");
    setKind("vanity");
    setIsVerified(false);
    setIsPrimary(false);
    setReason("");
    await load();
  };

  const handleToggle = async (
    row: DomainRow,
    field: "is_verified" | "is_primary",
    value: boolean,
  ) => {
    const why = window.prompt(`Reason for changing ${field} on ${row.hostname} (min 10 chars):`, "");
    if (!why || why.trim().length < 10) {
      toast({ title: "Reason required", description: "Min 10 characters.", variant: "destructive" });
      return;
    }
    const error = await callSet(
      row.hostname,
      row.kind,
      field === "is_verified" ? value : row.is_verified,
      field === "is_primary" ? value : row.is_primary,
      why.trim(),
    );
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  const handleRemove = async (row: DomainRow) => {
    const why = window.prompt(`Reason for removing ${row.hostname} (min 10 chars):`, "");
    if (!why || why.trim().length < 10) {
      toast({ title: "Reason required", description: "Min 10 characters.", variant: "destructive" });
      return;
    }
    const { error } = await (supabase.rpc as any)("admin_remove_org_custom_domain", {
      p_hostname: row.hostname,
      p_reason: why.trim(),
    });
    if (error) {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Domain removed" });
    await load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Custom Domains
          </CardTitle>
          <CardDescription>
            White-label hostnames that route to this organization's branded experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No custom domains configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.hostname}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.kind}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={row.is_verified}
                          onCheckedChange={(v) => handleToggle(row, "is_verified", v)}
                        />
                        {row.is_verified && <Badge variant="secondary">Verified</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={row.is_primary}
                          onCheckedChange={(v) => handleToggle(row, "is_primary", v)}
                        />
                        {row.is_primary && <Badge>Primary</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(row)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" />
            Add Domain
          </CardTitle>
          <CardDescription>
            Register a hostname so this org's branding loads pre-auth on that domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hostname *</Label>
              <Input
                placeholder="learning.acme.com"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Kind *</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as DomainKind)} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vanity">Vanity (customer-owned domain)</SelectItem>
                  <SelectItem value="subdomain">Subdomain (under our domain)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Verified</Label>
                <p className="text-xs text-muted-foreground">Mark once SSL is active in Lovable.</p>
              </div>
              <Switch checked={isVerified} onCheckedChange={setIsVerified} disabled={saving} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Primary</Label>
                <p className="text-xs text-muted-foreground">Canonical hostname for this org.</p>
              </div>
              <Switch checked={isPrimary} onCheckedChange={setIsPrimary} disabled={saving} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason * (min 10 characters, audited)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this change is being made..."
              disabled={saving}
              rows={3}
            />
          </div>

          <Button onClick={handleAdd} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Domain
          </Button>

          <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">Manual DNS / Lovable setup steps</p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>
                At the customer's DNS provider, point the hostname at Lovable: an{" "}
                <code className="font-mono">A</code> record to{" "}
                <code className="font-mono">185.158.133.1</code> for an apex domain, or a{" "}
                <code className="font-mono">CNAME</code> if proxied (Cloudflare, etc.).
              </li>
              <li>
                Add a TXT record <code className="font-mono">_lovable</code> with the verification
                value shown in the Lovable Domains dashboard.
              </li>
              <li>
                In the Lovable project → Settings → Domains, click <em>Connect Domain</em> and add
                this exact hostname. Wait for DNS to propagate and SSL to provision.
              </li>
              <li>
                Once the domain shows <em>Active</em> in Lovable, toggle <em>Verified</em> here so
                the app trusts it for pre-auth branding.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Note: Lovable does not support wildcard SSL — every subdomain (e.g.{" "}
              <code className="font-mono">tenant1.yourdomain.com</code>,{" "}
              <code className="font-mono">tenant2.yourdomain.com</code>) must be added as a
              separate entry both in Lovable and here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
