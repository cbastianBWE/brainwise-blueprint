import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { PLANS } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function BillingSettings() {
  const { user } = useAuth();
  const { subscription, loading, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);

  const tier = subscription?.tier || "base";
  const plan = PLANS[tier as keyof typeof PLANS] || PLANS.base;
  const isActive = subscription?.subscribed === true;

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Could not open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const endDate = subscription?.subscription_end
    ? new Date(subscription.subscription_end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and billing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {plan.name} Plan
                    {isActive && (
                      <Badge variant="secondary" className="ml-2">Active</Badge>
                    )}
                  </p>
                  {endDate && (
                    <p className="text-sm text-muted-foreground">
                      Next billing date: {endDate}
                    </p>
                  )}
                  {!isActive && (
                    <p className="text-sm text-muted-foreground">No active subscription</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Included features:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">AI chat limit: {plan.ai_limit} messages/month</span>
              </div>

              <div className="flex gap-3 pt-2">
                {isActive ? (
                  <Button onClick={handleManage} disabled={portalLoading} variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {portalLoading ? "Loading…" : "Manage Subscription"}
                  </Button>
                ) : (
                  <Button onClick={() => navigate("/pricing")}>
                    View Plans
                  </Button>
                )}
                {isActive && tier === "base" && (
                  <Button onClick={() => navigate("/pricing")} variant="default">
                    Upgrade to Premium
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
