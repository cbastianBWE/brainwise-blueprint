import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface CouponData {
  stripe_coupon_id: string | null;
  coupon_amount: number | null;
  coupon_expires_at: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("users")
        .select("stripe_coupon_id, coupon_amount, coupon_expires_at")
        .eq("id", user.id)
        .single();
      if (data) setCouponData(data);
    };
    fetch();
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
    <div className="space-y-4">
      {showBanner && (
        <div className="relative flex items-center justify-between gap-4 rounded-lg border border-primary bg-primary/10 p-4">
          <p className="text-sm font-medium">
            🎉 You have a ${couponData.coupon_amount} coach credit toward an annual subscription! Upgrade and save before it expires on {formattedExpiry}.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => navigate("/pricing")}>
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
      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You're logged in as {user?.email}. Your dashboard content will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
