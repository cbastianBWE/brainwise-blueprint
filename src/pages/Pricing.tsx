import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, ASSESSMENT_PURCHASE, type PlanTier, type BillingInterval } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const [interval, setInterval] = useState<BillingInterval>(
    searchParams.get("billing") === "annual" ? "annual" : "monthly"
  );
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (tier: PlanTier) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    setLoadingPlan(tier);
    try {
      const plan = PLANS[tier];
      const price_id = interval === "monthly" ? plan.monthly.price_id : plan.annual.price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id, mode: "subscription" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: unknown) {
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
          price_id: ASSESSMENT_PURCHASE.price_id,
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

  const planEntries = Object.entries(PLANS) as [PlanTier, (typeof PLANS)[PlanTier]][];

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Unlock your brain-based leadership potential with the plan that fits your needs.
        </p>
        {/* Billing toggle */}
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
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {planEntries.map(([tier, plan]) => {
          const price = interval === "monthly" ? plan.monthly.price : plan.annual.price;
          const isPremium = tier === "premium";

          return (
            <Card
              key={tier}
              className={`relative flex flex-col ${isPremium ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}
            >
              {isPremium && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="h-3 w-3" /> Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">${price}</span>
                  <span className="text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-6">
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isPremium ? "default" : "outline"}
                  onClick={() => handleSubscribe(tier)}
                  disabled={loadingPlan === tier}
                >
                  {loadingPlan === tier ? "Loading…" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-assessment section */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground flex items-center justify-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Per-Assessment Purchase
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Buy individual instrument assessments — no subscription needed
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {ASSESSMENT_PURCHASE.instruments.map((inst) => (
            <Card key={inst} className="text-center">
              <CardContent className="py-6 space-y-3">
                <p className="font-semibold text-foreground">{inst}</p>
                <p className="text-2xl font-bold text-foreground">${ASSESSMENT_PURCHASE.price}</p>
                <p className="text-xs text-muted-foreground">One-time per attempt</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handlePurchaseAssessment(inst)}
                  disabled={loadingPlan === inst}
                >
                  {loadingPlan === inst ? "Loading…" : "Purchase"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
