import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Star } from "lucide-react";

const INSTRUMENT_UUID_MAP: Record<string, string> = {
  "INST-001": "02618e9a-d411-44cf-b316-fe368edeac03",
  "INST-002": "77d1290f-1daf-44e0-931f-b9b8ad185520",
  "INST-003": "abb62120-8cc8-435f-babc-dd6a27fbc235",
  "INST-004": "90216d9d-153c-4b7b-abe0-1d7845c9e6e0",
};

const INSTRUMENTS = [
  {
    instrument_id: "INST-001",
    short_name: "PTP",
    instrument_name: "Personal Threat Profile",
    description: "Measures your nonconscious threat responses to understand how personal survival mechanisms influence your behavior and decision-making.",
    tier: "base" as const,
  },
  {
    instrument_id: "INST-002",
    short_name: "NAI",
    instrument_name: "Neuroscience Adoption Index",
    description: "Measures your nonconscious beliefs and threat responses related to AI adoption to understand what may be driving resistance or readiness.",
    tier: "premium" as const,
  },
  {
    instrument_id: "INST-003",
    short_name: "AIRSA",
    instrument_name: "AI Readiness Skills Assessment",
    description: "Assesses your readiness to adopt and leverage AI tools effectively in your role and organization.",
    tier: "premium" as const,
  },
  {
    instrument_id: "INST-004",
    short_name: "HSS",
    instrument_name: "Habit Stabilization Scorecard",
    description: "Measures the stability and sustainability of behavioral changes related to AI adoption, helping you understand the degree to which new behaviors are stabilizing and becoming normalized.",
    tier: "premium" as const,
  },
];

interface Props {
  onSelect: (instrument: {
    instrument_id: string;
    instrument_name: string;
    instrument_version: string;
    short_name: string;
  }) => void;
}

export default function InstrumentSelection({ onSelect }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userTier, setUserTier] = useState<string>("base");
  const [userStatus, setUserStatus] = useState<string>("inactive");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [platformVersion, setPlatformVersion] = useState<string>("");
  const [coachPaidInstrumentIds, setCoachPaidInstrumentIds] = useState<Set<string>>(new Set());
  const [purchasedInstrumentIds, setPurchasedInstrumentIds] = useState<Set<string>>(new Set());
  const [completedInstrumentIds, setCompletedInstrumentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [userRes, versionRes, resultsRes, coachClientsRes, purchasesRes, completedRes] = await Promise.all([
        supabase.from("users").select("subscription_tier, subscription_status").eq("id", user.id).single(),
        supabase.from("platform_versions").select("version_string").eq("is_active", true).limit(1).single(),
        supabase.from("assessment_results").select("overall_profile").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("coach_clients")
          .select("instrument_id, stripe_payment_intent_id, assessment_id")
          .eq("client_user_id", user.id)
          .not("stripe_payment_intent_id", "is", null)
          .is("assessment_id", null)
          .neq("invitation_status", "completed"),
        supabase.from("assessment_purchases").select("instrument_id").eq("user_id", user.id),
        supabase.from("assessments").select("instrument_id").eq("user_id", user.id).eq("status", "completed"),
      ]);

      if (userRes.data) {
        setUserTier(userRes.data.subscription_tier || "base");
        setUserStatus(userRes.data.subscription_status || "inactive");
      }
      if (versionRes.data) setPlatformVersion(versionRes.data.version_string);

      // Extract recommendations from latest result
      if (resultsRes.data && resultsRes.data.length > 0) {
        const profile = resultsRes.data[0].overall_profile as Record<string, unknown> | null;
        if (profile?.triggered_cross_instrument_recommendations) {
          const recs = profile.triggered_cross_instrument_recommendations;
          if (Array.isArray(recs)) setRecommendations(recs.map((r: unknown) => String(r)));
        }
      }

      // Build set of coach-paid instrument UUIDs
      if (coachClientsRes.data) {
        const ids = new Set<string>();
        coachClientsRes.data.forEach((row) => {
          if (row.instrument_id) ids.add(row.instrument_id);
        });
        setCoachPaidInstrumentIds(ids);
      }

      // Build set of purchased instrument IDs
      if (purchasesRes.data) {
        const ids = new Set<string>();
        purchasesRes.data.forEach((row) => {
          if (row.instrument_id) ids.add(row.instrument_id);
        });
        setPurchasedInstrumentIds(ids);
      }

      // Build set of completed instrument IDs
      if (completedRes.data) {
        const ids = new Set<string>();
        completedRes.data.forEach((row) => {
          if (row.instrument_id) ids.add(row.instrument_id);
        });
        setCompletedInstrumentIds(ids);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const canAccessBySubscription = (tier: "base" | "premium") => {
    if (userStatus === "inactive" || !userStatus) return false;
    if (tier === "base") return true;
    return userTier === "premium";
  };

  const handleSelect = (inst: (typeof INSTRUMENTS)[0]) => {
    onSelect({
      instrument_id: inst.instrument_id,
      instrument_name: inst.instrument_name,
      instrument_version: platformVersion || "1.0",
      short_name: inst.short_name,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <Brain className="mx-auto h-10 w-10 text-primary mb-3" />
        <h1 className="text-2xl font-semibold text-foreground">Choose an Assessment</h1>
        <p className="text-muted-foreground mt-1">Select an instrument to begin your self-assessment</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {INSTRUMENTS.map((inst) => {
          const isRecommended = recommendations.includes(inst.instrument_id);
          const subscriptionAccess = canAccessBySubscription(inst.tier);
          const instrumentUuid = INSTRUMENT_UUID_MAP[inst.instrument_id] || "";
          const coachPaid = coachPaidInstrumentIds.has(instrumentUuid);
          const hasPurchase = purchasedInstrumentIds.has(inst.instrument_id) || purchasedInstrumentIds.has(inst.short_name);
          const hasCompleted = completedInstrumentIds.has(inst.instrument_id);
          // Purchase grants one attempt; if completed, need new purchase
          const purchaseAccess = hasPurchase && !hasCompleted;

          let buttonContent: React.ReactNode;
          if (subscriptionAccess) {
            buttonContent = (
              <Button className="w-full" onClick={() => handleSelect(inst)}>
                Start Assessment
              </Button>
            );
          } else if (coachPaid) {
            buttonContent = (
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 border border-primary"
                onClick={() => handleSelect(inst)}
              >
                Start Assessment (Coach Paid)
              </Button>
            );
          } else if (purchaseAccess) {
            buttonContent = (
              <Button className="w-full" onClick={() => handleSelect(inst)}>
                Start Assessment
              </Button>
            );
          } else {
            buttonContent = (
              <Button variant="outline" className="w-full" onClick={() => navigate("/pricing")}>
                {userStatus === "inactive" || !userStatus ? "Purchase to Access" : "Upgrade to Premium"}
              </Button>
            );
          }

          return (
            <Card
              key={inst.instrument_id}
              className={`relative transition-all ${isRecommended ? "ring-2 ring-primary" : ""} ${subscriptionAccess || coachPaid || purchaseAccess ? "hover:shadow-md" : "opacity-80"}`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Star className="h-3 w-3" /> Recommended based on your previous results
                  </Badge>
                </div>
              )}
              <CardHeader className={isRecommended ? "pt-8" : ""}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{inst.short_name}</CardTitle>
                  {inst.tier === "premium" && (
                    <Badge variant="secondary" className="text-xs">Premium</Badge>
                  )}
                </div>
                <CardDescription className="font-medium text-foreground">{inst.instrument_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{inst.description}</p>
                {buttonContent}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
