import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Brain, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface CouponData {
  stripe_coupon_id: string | null;
  coupon_amount: number | null;
  coupon_expires_at: string | null;
}

export default function AppLayout() {
  const { user } = useAuth();
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
          <header className="h-12 flex items-center border-b border-border px-4 gap-2">
            <SidebarTrigger />
            <Brain className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">BrainWise</span>
          </header>
          <main className="flex-1 overflow-auto p-6">
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
