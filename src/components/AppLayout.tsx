import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CoachDisclosureGate } from "@/components/coach/CoachDisclosureGate";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface CouponData {
  stripe_coupon_id: string | null;
  coupon_amount: number | null;
  coupon_expires_at: string | null;
}

export default function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchCoupon = async () => {
      const { data } = await supabase
        .from("users")
        .select("stripe_coupon_id, coupon_amount, coupon_expires_at")
        .eq("id", user.id)
        .single();
      if (data) setCouponData(data);
    };
    fetchCoupon();
  }, [user]);

  const [branding, setBranding] = useState<{ logoUrl: string | null; orgName: string | null; isDefault: boolean; loaded: boolean }>({
    logoUrl: null,
    orgName: null,
    isDefault: true,
    loaded: false,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBranding({ logoUrl: null, orgName: null, isDefault: true, loaded: true });
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await (supabase.rpc as any)("get_org_branding_for_current_user");
      if (!active) return;
      if (error || !data || data.is_default) {
        setBranding({ logoUrl: null, orgName: null, isDefault: true, loaded: true });
        return;
      }
      const path = data.brand_logo_path as string | null;
      const logoUrl = path
        ? supabase.storage.from("org-branding").getPublicUrl(path).data.publicUrl
        : null;
      setBranding({ logoUrl, orgName: (data.organization_name as string) ?? null, isDefault: false, loaded: true });
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const showBanner =
    !dismissed &&
    couponData?.stripe_coupon_id &&
    couponData?.coupon_expires_at &&
    new Date(couponData.coupon_expires_at) > new Date();

  const formattedExpiry = couponData?.coupon_expires_at
    ? new Date(couponData.coupon_expires_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header
            className="flex items-center px-4 gap-3"
            style={{
              background: "hsl(var(--primary))",
              height: 56,
              borderBottom: "1px solid hsl(var(--primary-foreground) / 0.15)",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            <SidebarTrigger className="hover:opacity-80" style={{ color: "hsl(var(--primary-foreground))" }} />
            {branding.isDefault ? (
              <>
                <img src="/brain-icon.png" alt="BrainWise Enterprises" style={{ height: 28, width: 28 }} />
                <span
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 800,
                    fontSize: 16,
                    color: "hsl(var(--primary-foreground))",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                  }}
                >
                  BrainWise Enterprises
                </span>
              </>
            ) : (
              <>
                {branding.logoUrl && (
                  <img
                    src={branding.logoUrl}
                    alt={branding.orgName ?? "Organization"}
                    style={{ height: 32, width: "auto", maxWidth: 180, objectFit: "contain" }}
                  />
                )}
                {branding.orgName && (
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 800,
                      fontSize: 16,
                      color: "hsl(var(--primary-foreground))",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {branding.orgName}
                  </span>
                )}
              </>
            )}
            <div className="ml-auto flex items-center">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <CoachDisclosureGate>
              {showBanner && (
                <div className="relative flex items-center justify-between gap-4 rounded-lg border border-primary bg-primary/10 p-4 mb-6">
                  <p className="text-sm font-medium">
                    🎉 You have a ${couponData.coupon_amount} coach credit toward an annual subscription! Upgrade and save before it expires on {formattedExpiry}.
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" onClick={() => navigate("/pricing?billing=annual")}>
                      Upgrade Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDismissed(true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <Outlet />
            </CoachDisclosureGate>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
