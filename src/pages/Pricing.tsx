import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionPlans, type CatalogueTier } from "@/hooks/useSubscriptionPlans";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { BillingInterval } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { catalogueFor, oneTimePrice, oneTimePriceId, loading } = useSubscriptionPlans();
  const searchParams = new URLSearchParams(window.location.search);
  const [interval, setInterval] = useState<BillingInterval>(
    searchParams.get("billing") === "annual" ? "annual" : "monthly"
  );
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const audience = profile?.account_type === "coach" ? "coach" : "individual";
  const tiers = catalogueFor(audience);
  const purchasable = tiers.filter((t) => t.monthly || t.annual);
  const recommendedTier = purchasable.length
    ? purchasable.reduce((a, b) => (a.sortOrder >= b.sortOrder ? a : b)).tier
    : null;

  const handleSubscribe = async (t: CatalogueTier) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    const selected = interval === "monthly" ? t.monthly : t.annual;
    const fallback = selected ?? t.monthly ?? t.annual;
    if (!fallback) return;
    setLoadingPlan(t.tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: fallback.priceId, mode: "subscription" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePurchaseAssessment = async (instrumentId: string) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    const priceId = oneTimePriceId("individual");
    if (!priceId) {
      toast.error("Pricing is unavailable right now. Please try again shortly.");
      return;
    }
    setLoadingPlan(instrumentId);
    try {
      const INSTRUMENT_SHORT_TO_UUID: Record<string, string> = {
        "PTP": "02618e9a-d411-44cf-b316-fe368edeac03",
        "NAI": "77d1290f-1daf-44e0-931f-b9b8ad185520",
        "AIRSA": "abb62120-8cc8-435f-babc-dd6a27fbc235",
        "HSS": "90216d9d-153c-4b7b-abe0-1d7845c9e6e0",
      };
      const resolvedId = INSTRUMENT_SHORT_TO_UUID[instrumentId] ?? instrumentId;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: priceId,
          mode: "payment",
          instrument_id: resolvedId,
          instrument_ids: resolvedId,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const assessmentPrice = oneTimePrice("individual");

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Unlock your brain-based leadership potential with the plan that fits your needs.
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <Label className={`text-sm ${interval === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>Monthly</Label>
          <Switch
            checked={interval === "annual"}
            onCheckedChange={(checked) => setInterval(checked ? "annual" : "monthly")}
          />
          <Label className={`text-sm ${interval === "annual" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Annual
            <Badge variant="secondary" className="ml-2 text-xs">Save up to 23%</Badge>
          </Label>
        </div>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32 mx-auto" /></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-20 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tiers.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Plans are unavailable right now. Please try again shortly.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {tiers.map((t) => {
            const selected = interval === "monthly" ? t.monthly : t.annual;
            const shown = selected ?? t.monthly ?? t.annual;
            const shownIsFallback = !selected && !!shown;
            const shownInterval = selected ? interval : (t.monthly ? "monthly" : "annual");
            const isRecommended = t.tier === recommendedTier;
            const isPurchasable = !!shown;

            return (
              <Card
                key={t.tier}
                className={`relative flex flex-col ${isRecommended ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}
              >
                {isRecommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                    <Sparkles className="h-3 w-3" /> Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{t.displayName}</CardTitle>
                  <CardDescription>
                    {isPurchasable ? (
                      <>
                        <span className="text-3xl font-bold text-foreground">${shown!.price}</span>
                        <span className="text-muted-foreground">/{shownInterval === "monthly" ? "mo" : "yr"}</span>
                        {shownIsFallback && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Only available {shownInterval === "monthly" ? "monthly" : "annually"}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-semibold text-foreground">Free</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-6">
                  <ul className="space-y-2.5 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {isPurchasable ? (
                    <Button
                      className="w-full"
                      variant={isRecommended ? "default" : "outline"}
                      onClick={() => handleSubscribe(t)}
                      disabled={loadingPlan === t.tier}
                    >
                      {loadingPlan === t.tier ? "Loading…" : "Get Started"}
                    </Button>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">Included</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Per-assessment section — individual audience only */}
      {audience === "individual" && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Per-Assessment Purchase
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Buy individual instrument assessments, no subscription needed
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {["PTP"].map((inst) => (
              <Card key={inst} className="text-center">
                <CardContent className="py-6 space-y-3">
                  <p className="font-semibold text-foreground">{inst}</p>
                  {assessmentPrice !== null ? (
                    <p className="text-2xl font-bold text-foreground">${assessmentPrice}</p>
                  ) : (
                    <Skeleton className="h-7 w-16 mx-auto" />
                  )}
                  <p className="text-xs text-muted-foreground">One-time per attempt</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handlePurchaseAssessment(inst)}
                    disabled={loadingPlan === inst || assessmentPrice === null}
                  >
                    {loadingPlan === inst ? "Loading…" : "Purchase"}
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card className="text-center border-dashed">
              <CardContent className="py-6 space-y-3 flex flex-col items-center justify-center h-full">
                <p className="font-semibold text-foreground">NAI, AIRSA &amp; HSS</p>
                <p className="text-sm text-muted-foreground">Available through a consultation with our team.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/contact")}
                >
                  Contact us
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
