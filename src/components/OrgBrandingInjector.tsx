import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PRIMARY_VARS = ["--primary", "--primary-foreground"] as const;
const ACCENT_VARS = [
  "--accent",
  "--accent-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
] as const;

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function hexToHslParts(hex: string): string | null {
  if (!HEX_RE.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function idealForeground(hex: string): string {
  const toLin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(hex.slice(1, 3), 16));
  const g = toLin(parseInt(hex.slice(3, 5), 16));
  const b = toLin(parseInt(hex.slice(5, 7), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "211 94% 11%" : "0 0% 100%";
}

function clearBranding() {
  const root = document.documentElement;
  [...PRIMARY_VARS, ...ACCENT_VARS].forEach((v) => root.style.removeProperty(v));
}

function applyBrandingPayload(data: any) {
  if (!data || data.is_default) {
    clearBranding();
    return;
  }
  const root = document.documentElement;
  const primary = data.brand_primary_color as string | null;
  const accent = data.brand_accent_color as string | null;

  const primaryHsl = primary ? hexToHslParts(primary) : null;
  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--primary-foreground", idealForeground(primary!));
  }
  const accentHsl = accent ? hexToHslParts(accent) : null;
  if (accentHsl) {
    const accentFg = idealForeground(accent!);
    root.style.setProperty("--accent", accentHsl);
    root.style.setProperty("--accent-foreground", accentFg);
    root.style.setProperty("--ring", accentHsl);
    root.style.setProperty("--sidebar-primary", accentHsl);
    root.style.setProperty("--sidebar-primary-foreground", accentFg);
    root.style.setProperty("--sidebar-ring", accentHsl);
  }
}

export default function OrgBrandingInjector() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    let active = true;

    (async () => {
      if (user) {
        const { data, error } = await (supabase.rpc as any)(
          "get_org_branding_for_current_user",
        );
        if (!active) return;
        if (error) {
          clearBranding();
          return;
        }
        applyBrandingPayload(data);
      } else {
        const { data, error } = await (supabase.rpc as any)(
          "get_org_branding_for_hostname",
          { p_hostname: window.location.hostname },
        );
        if (!active) return;
        if (error) {
          clearBranding();
          return;
        }
        applyBrandingPayload(data);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, loading]);

  useEffect(() => clearBranding, []);
  return null;
}
