import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, Save } from "lucide-react";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const BUCKET = "org-branding";
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  orgId: string;
}

type BrandingRow = {
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  brand_logo_path: string | null;
} | null;

export default function CompanyBrandingSection({ orgId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [usePrimary, setUsePrimary] = useState(false);
  const [primary, setPrimary] = useState("#021F36");
  const [useAccent, setUseAccent] = useState(false);
  const [accent, setAccent] = useState("#F5741A");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const logoUrl = logoPath
    ? supabase.storage.from(BUCKET).getPublicUrl(logoPath).data.publicUrl
    : null;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("brand_primary_color, brand_accent_color, brand_logo_path")
        .eq("id", orgId)
        .single();
      if (!active) return;
      if (error) {
        toast({
          title: "Could not load branding",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const row = data as BrandingRow;
        if (row?.brand_primary_color) {
          setUsePrimary(true);
          setPrimary(row.brand_primary_color);
        }
        if (row?.brand_accent_color) {
          setUseAccent(true);
          setAccent(row.brand_accent_color);
        }
        setLogoPath(row?.brand_logo_path ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [orgId, toast]);

  const onPickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast({
        title: "Unsupported file",
        description: "Use PNG, JPEG, WebP, or SVG.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Max 2 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `org/${orgId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    setLogoPath(path);
    toast({ title: "Logo uploaded", description: "Click Save to apply it." });
  };

  const primaryInvalid = usePrimary && !HEX_RE.test(primary);
  const accentInvalid = useAccent && !HEX_RE.test(accent);
  const reasonInvalid = reason.trim().length < 10;
  const canSave = !saving && !loading && !primaryInvalid && !accentInvalid && !reasonInvalid;

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.rpc as any)("admin_set_org_branding", {
      p_organization_id: orgId,
      p_primary_color: usePrimary ? primary : null,
      p_accent_color: useAccent ? accent : null,
      p_logo_path: logoPath,
      p_reason: reason.trim(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Branding saved", description: "Org members see it on next load." });
    setReason("");
  };

  const resetAll = async () => {
    setSaving(true);
    const { error } = await (supabase.rpc as any)("admin_set_org_branding", {
      p_organization_id: orgId,
      p_primary_color: null,
      p_accent_color: null,
      p_logo_path: null,
      p_reason:
        reason.trim().length >= 10 ? reason.trim() : "Reset branding to BrainWise default",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      return;
    }
    setUsePrimary(false);
    setPrimary("#021F36");
    setUseAccent(false);
    setAccent("#F5741A");
    setLogoPath(null);
    setReason("");
    toast({ title: "Branding reset to default" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading branding...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>White-label branding</CardTitle>
        <CardDescription>
          Set this organization's logo and brand colors. Members of this org see them across
          the app; everyone else keeps the BrainWise default. Leave a color unchecked to
          inherit the default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary color */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="use-primary"
              checked={usePrimary}
              onCheckedChange={(v) => setUsePrimary(v === true)}
            />
            <Label htmlFor="use-primary">Custom primary color</Label>
          </div>
          {usePrimary && (
            <div className="flex items-center gap-2 pl-6">
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-9 w-12 rounded border"
              />
              <Input
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder="#021F36"
                className="w-40 font-mono"
              />
              {primaryInvalid && (
                <span className="text-sm text-destructive">6-digit hex</span>
              )}
            </div>
          )}
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="use-accent"
              checked={useAccent}
              onCheckedChange={(v) => setUseAccent(v === true)}
            />
            <Label htmlFor="use-accent">Custom accent color</Label>
          </div>
          {useAccent && (
            <div className="flex items-center gap-2 pl-6">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-9 w-12 rounded border"
              />
              <Input
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#F5741A"
                className="w-40 font-mono"
              />
              {accentInvalid && (
                <span className="text-sm text-destructive">6-digit hex</span>
              )}
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Org logo"
                className="h-16 w-16 rounded border object-contain bg-white"
              />
            ) : (
              <div className="h-16 w-16 rounded border flex items-center justify-center text-xs text-muted-foreground">
                No logo
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-3 h-9 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
                <input
                  id="logo-upload"
                  type="file"
                  accept={ALLOWED.join(",")}
                  className="hidden"
                  onChange={(e) => onPickLogo(e.target.files?.[0])}
                />
              </Label>
              {logoPath && (
                <Button variant="outline" size="sm" onClick={() => setLogoPath(null)}>
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPEG, WebP, or SVG. Max 2 MB. Click Save to apply.
          </p>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="branding-reason">Reason (audit, min 10 chars)</Label>
          <Textarea
            id="branding-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you changing this org's branding?"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!canSave}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save branding
          </Button>
          <Button variant="outline" onClick={resetAll} disabled={saving}>
            Reset to default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
