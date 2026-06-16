import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandColorSwatch } from "./BrandColorSwatch";
import { lessonBrandQueryKey } from "./LessonTitleCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentItemId: string;
}

type ColorKey =
  | "color_primary"
  | "color_cta"
  | "color_surface"
  | "color_accent"
  | "color_free1"
  | "color_free2";

interface BrandState {
  logo_path: string | null;
  color_primary: string | null;
  color_cta: string | null;
  color_surface: string | null;
  color_accent: string | null;
  color_free1: string | null;
  color_free2: string | null;
  font_display_key: string | null;
  font_body_key: string | null;
}

const EMPTY_BRAND: BrandState = {
  logo_path: null,
  color_primary: null,
  color_cta: null,
  color_surface: null,
  color_accent: null,
  color_free1: null,
  color_free2: null,
  font_display_key: null,
  font_body_key: null,
};

const COLOR_SLOTS: { key: ColorKey; label: string; help: string }[] = [
  { key: "color_primary", label: "Primary", help: "Headlines & primary text" },
  { key: "color_cta", label: "CTA", help: "Buttons & emphasis" },
  { key: "color_surface", label: "Surface", help: "Card background" },
  { key: "color_accent", label: "Accent", help: "Supporting labels" },
  { key: "color_free1", label: "Free slot 1", help: "Reserved for future use" },
  { key: "color_free2", label: "Free slot 2", help: "Reserved for future use" },
];

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "__default__", label: "Default (BrainWise)" },
  { value: "inter", label: "Inter" },
  { value: "lora", label: "Lora" },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function ColorSlot({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [hexInput, setHexInput] = useState(value ?? "");
  useEffect(() => {
    setHexInput(value ?? "");
  }, [value]);

  const commitHex = (raw: string) => {
    const v = raw.trim();
    if (v === "") {
      onChange(null);
      return;
    }
    if (HEX_RE.test(v)) onChange(v.toUpperCase());
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">{help}</span>
      </div>
      <BrandColorSwatch
        value={value}
        onChange={(v) => onChange(v)}
        allowDefault
        defaultLabel="Default"
      />
      <div className="flex items-center gap-2 pt-1">
        <input
          type="color"
          value={value && HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-8 w-10 cursor-pointer rounded border bg-transparent"
          aria-label={`${label} custom color`}
        />
        <Input
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={(e) => commitHex(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          className="h-8 w-28 font-mono text-xs"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        )}
      </div>
      {hexInput && !HEX_RE.test(hexInput) && hexInput !== "" && (
        <p className="text-xs text-destructive">Enter a valid #RRGGBB hex.</p>
      )}
    </div>
  );
}

export function LessonBrandPanel({ open, onOpenChange, contentItemId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [brand, setBrand] = useState<BrandState>(EMPTY_BRAND);

  useEffect(() => {
    if (!open || !contentItemId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("lesson_brands")
        .select("*")
        .eq("content_item_id", contentItemId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({
          title: "Couldn't load brand",
          description: error.message,
          variant: "destructive",
        });
        setBrand(EMPTY_BRAND);
      } else if (!data) {
        setBrand(EMPTY_BRAND);
      } else {
        setBrand({
          logo_path: (data.logo_path as string | null) ?? null,
          color_primary: (data.color_primary as string | null) ?? null,
          color_cta: (data.color_cta as string | null) ?? null,
          color_surface: (data.color_surface as string | null) ?? null,
          color_accent: (data.color_accent as string | null) ?? null,
          color_free1: (data.color_free1 as string | null) ?? null,
          color_free2: (data.color_free2 as string | null) ?? null,
          font_display_key: (data.font_display_key as string | null) ?? null,
          font_body_key: (data.font_body_key as string | null) ?? null,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, contentItemId, toast]);

  const updateColor = (key: ColorKey, v: string | null) =>
    setBrand((b) => ({ ...b, [key]: v }));

  const logoUrl = brand.logo_path
    ? supabase.storage.from("lesson-branding").getPublicUrl(brand.logo_path).data.publicUrl
    : null;

  const onLogoFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${contentItemId}/logo-${Date.now()}.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage
      .from("lesson-branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    setBrand((b) => ({ ...b, logo_path: path }));
  };

  const handleSave = async () => {
    // validate hex slots
    for (const slot of COLOR_SLOTS) {
      const v = brand[slot.key];
      if (v != null && !HEX_RE.test(v)) {
        toast({
          title: "Invalid color",
          description: `${slot.label} is not a valid #RRGGBB hex.`,
          variant: "destructive",
        });
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase.rpc("upsert_lesson_brand", {
      p_content_item_id: contentItemId,
      p_logo_path: brand.logo_path,
      p_color_primary: brand.color_primary,
      p_color_cta: brand.color_cta,
      p_color_surface: brand.color_surface,
      p_color_accent: brand.color_accent,
      p_color_free1: brand.color_free1,
      p_color_free2: brand.color_free2,
      p_font_display_key: brand.font_display_key,
      p_font_body_key: brand.font_body_key,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: lessonBrandQueryKey(contentItemId) });
    toast({ title: "Brand saved" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Lesson brand</SheetTitle>
          <SheetDescription>
            Override logo, colors, and fonts for this lesson. Empty means BrainWise default.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-6">
            {/* Logo */}
            <section className="space-y-2">
              <Label className="text-sm font-medium">Logo</Label>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <div className="flex h-14 w-24 items-center justify-center overflow-hidden rounded bg-muted">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {uploading ? "Uploading…" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onLogoFile(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {brand.logo_path && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 justify-start px-2 text-xs"
                      onClick={() => setBrand((b) => ({ ...b, logo_path: null }))}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Remove logo
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* Colors */}
            <section className="space-y-3">
              <Label className="text-sm font-medium">Colors</Label>
              <div className="space-y-3">
                {COLOR_SLOTS.map((s) => (
                  <ColorSlot
                    key={s.key}
                    label={s.label}
                    help={s.help}
                    value={brand[s.key]}
                    onChange={(v) => updateColor(s.key, v)}
                  />
                ))}
              </div>
            </section>

            {/* Fonts */}
            <section className="space-y-3">
              <Label className="text-sm font-medium">Fonts</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Display font</Label>
                  <Select
                    value={brand.font_display_key ?? "__default__"}
                    onValueChange={(v) =>
                      setBrand((b) => ({
                        ...b,
                        font_display_key: v === "__default__" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Body font</Label>
                  <Select
                    value={brand.font_body_key ?? "__default__"}
                    onValueChange={(v) =>
                      setBrand((b) => ({
                        ...b,
                        font_body_key: v === "__default__" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save brand"
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default LessonBrandPanel;
