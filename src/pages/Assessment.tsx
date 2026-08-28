import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import InstrumentSelection from "@/components/assessment/InstrumentSelection";
import AssessmentFlow from "@/components/assessment/AssessmentFlow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountRole } from "@/lib/accountRoles";
import { INSTRUMENT_ID_TO_SHORT_NAME, INSTRUMENT_ID_TO_NAME, getInstrumentByInstrumentId } from "@/lib/instruments";

interface SelectedInstrument {
  instrument_id: string;
  instrument_name: string;
  instrument_version: string;
  short_name: string;
  epnAssignmentId?: string;
  preexistingAssessmentId?: string;
  raterType?: 'self' | 'manager';
  targetUserName?: string;
  contextType?: 'professional' | 'personal' | 'both';
}

type EntitlementSource =
  | 'free_cert_pool'
  | 'paid_purchase'
  | 'coach_paid_client'
  | 'self_pay_coach_invite';

export default function Assessment() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isCorp, canBypassAssessmentPaywall } = useAccountRole();

  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrument | null>(null);
  const [contextType, setContextType] = useState<'professional' | 'personal' | 'both' | null>(null);
  const [ptpRecommended, setPtpRecommended] = useState<'professional' | 'personal' | 'both' | null>(null);
  const [ptpContextLoading, setPtpContextLoading] = useState(false);
  const [entitlementSource, setEntitlementSource] = useState<EntitlementSource | null>(null);
  const [epnStarting, setEpnStarting] = useState(false);


  const epnAssignmentsQuery = useQuery({
    queryKey: ["my-epn-assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_epn_assignments");
      if (error) throw error;
      return (data ?? []) as Array<{
        assignment_id: string;
        organization_id: string;
        organization_name: string;
        instrument_id: string;
        status: string;
        assigned_at: string;
        notes: string | null;
      }>;
    },
  });

  const pendingManagerQuery = useQuery({
    queryKey: ["my-pending-manager-assessments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("my_pending_manager_assessments");
      if (error) throw error;
      return (data ?? []) as Array<{
        manager_assessment_id: string;
        paired_self_assessment_id: string;
        self_rater_user_id: string;
        self_rater_full_name: string;
        self_rater_email: string;
        self_rater_department_name: string | null;
        manager_status: string;
        manager_started_at: string | null;
        reminder_count: number;
        last_reminder_sent_at: string | null;
        self_completed_at: string;
      }>;
    },
  });

  // Handle autostart from post-payment redirect
  useEffect(() => {
    const instrumentId = searchParams.get("instrument");
    const autostart = searchParams.get("autostart");
    if (!instrumentId || autostart !== "true") return;
    if (!user) return;

    // EPN is started via handleStartEpn(assignmentId), not via URL autostart. Guard against accidental autostart routing.
    if (instrumentId === "INST-002L") return;

    const shortName = INSTRUMENT_ID_TO_SHORT_NAME[instrumentId];
    const instrumentName = INSTRUMENT_ID_TO_NAME[instrumentId];
    if (!shortName || !instrumentName) return;

    const init = async () => {
      // Individual gating: hidden instruments must not be startable via the
      // autostart/direct-URL path. Mirrors InstrumentSelection's predicate:
      // isPTP || featureAllowed || any explicit entitlement signal.
      // Corp users and super-admins bypass this check.
      const gateIndividual = !isCorp && !canBypassAssessmentPaywall;
      if (gateIndividual) {
        const meta = getInstrumentByInstrumentId(instrumentId);
        const uuid = meta?.uuid ?? "";
        const PTP_UUID = "02618e9a-d411-44cf-b316-fe368edeac03";
        let visible = uuid === PTP_UUID;

        if (!visible && uuid) {
          const { data: flagData } = await (supabase.rpc as any)("user_has_features_bulk", {
            p_user: user.id,
            p_features: [`instrument:${uuid}`],
          });
          if (Array.isArray(flagData)) {
            const row = flagData.find((r: { feature: string }) => r.feature === `instrument:${uuid}`);
            if (row?.enabled === true) visible = true;
          }
        }

        if (!visible) {
          // Check explicit entitlement signals for this instrument.
          const [subRes, purchasesRes, coachRes, certsRes] = await Promise.all([
            supabase.from("users").select("subscription_tier, subscription_status").eq("id", user.id).maybeSingle(),
            supabase.from("assessment_purchases").select("instrument_id").eq("user_id", user.id).is("consumed_at", null).is("coach_client_id", null),
            supabase.from("coach_clients_client_view")
              .select("instrument_id")
              .eq("client_user_id", user.id)
              .in("invitation_status", ["sent", "opened", "partially_completed"]),
            supabase.from("coach_certifications")
              .select("certification_type, status, free_assessment_uses, free_uses_expire_at")
              .eq("user_id", user.id)
              .in("status", ["in_progress", "certified"]),
          ]);

          const subActive = subRes.data?.subscription_status === "active";
          const tier = subRes.data?.subscription_tier || "base";
          // Premium sub covers all instruments; base only covers PTP (already short-circuited above).
          if (subActive && tier === "premium") visible = true;

          if (!visible) {
            const purchaseIds = new Set<string>();
            (purchasesRes.data ?? []).forEach((row) => {
              if (row.instrument_id) {
                row.instrument_id.split(",").forEach((id: string) => purchaseIds.add(id.trim()));
              }
            });
            if (purchaseIds.has(uuid) || purchaseIds.has(instrumentId) || purchaseIds.has(shortName)) {
              visible = true;
            }
          }

          if (!visible) {
            const coachIds = new Set<string>();
            (coachRes.data ?? []).forEach((row) => {
              if (row.instrument_id) coachIds.add(row.instrument_id);
            });
            if (coachIds.has(uuid)) visible = true;
          }

          if (!visible) {
            const nowMs = Date.now();
            for (const cert of certsRes.data ?? []) {
              if (cert.free_uses_expire_at && new Date(cert.free_uses_expire_at).getTime() <= nowMs) continue;
              const uses = (cert.free_assessment_uses ?? {}) as Record<string, number>;
              if ((uses[instrumentId] ?? 0) > 0) {
                visible = true;
                break;
              }
            }
          }
        }

        if (!visible) {
          // Hidden instrument — drop autostart params and let the picker render
          // (which will surface the consolidated "request access" card).
          setSearchParams({}, { replace: true });
          return;
        }
      }

      const { data } = await supabase
        .from("platform_versions")
        .select("version_string")
        .eq("is_active", true)
        .limit(1)
        .single();

      setSelectedInstrument({
        instrument_id: instrumentId,
        instrument_name: instrumentName,
        instrument_version: data?.version_string || "1.0",
        short_name: shortName,
      });
      setEntitlementSource('paid_purchase');


      setSearchParams({}, { replace: true });
    };
    init();
  }, [searchParams, setSearchParams, user, isCorp, canBypassAssessmentPaywall]);

  // Persist standard selection in URL so a remount or refresh resumes in place.
  useEffect(() => {
    if (!selectedInstrument) return;
    if (selectedInstrument.epnAssignmentId || selectedInstrument.preexistingAssessmentId) return;
    const next = new URLSearchParams();
    next.set("resumeInstrument", selectedInstrument.instrument_id);
    if (contextType) next.set("resumeContext", contextType);
    if (entitlementSource) next.set("resumeSrc", entitlementSource);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstrument, contextType, entitlementSource]);

  // Rehydrate selection from URL after remount/refresh.
  useEffect(() => {
    if (selectedInstrument || !user) return;
    const resumeId = searchParams.get("resumeInstrument");
    if (!resumeId) return;
    const shortName = INSTRUMENT_ID_TO_SHORT_NAME[resumeId];
    const instrumentName = INSTRUMENT_ID_TO_NAME[resumeId];
    if (!shortName || !instrumentName) return;
    const ctx = searchParams.get("resumeContext") as 'professional' | 'personal' | 'both' | null;
    const src = searchParams.get("resumeSrc") as EntitlementSource | null;
    (async () => {
      const { data } = await supabase
        .from("platform_versions")
        .select("version_string")
        .eq("is_active", true)
        .limit(1)
        .single();
      if (ctx) setContextType(ctx);
      if (src) setEntitlementSource(src);
      setSelectedInstrument({
        instrument_id: resumeId,
        instrument_name: instrumentName,
        instrument_version: data?.version_string || "1.0",
        short_name: shortName,
      });
    })();
  }, [user, searchParams, selectedInstrument]);

  useEffect(() => {
    if (!selectedInstrument) return;
    if (selectedInstrument.instrument_id !== "INST-001") return;
    if (contextType !== null) return;

    let cancelled = false;
    setPtpContextLoading(true);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setPtpContextLoading(false); return; }

      // coach_clients stores the instrument UUID, not the "INST-001" short code.
      const ptpUuid = getInstrumentByInstrumentId(selectedInstrument.instrument_id)?.uuid;

      const [ccRes, purchaseRes] = await Promise.all([
        supabase
          .from("coach_clients_client_view")
          .select("context_progress, preferred_first_context, created_at")
          .eq("client_user_id", user.id)
          .eq("instrument_id", ptpUuid ?? selectedInstrument.instrument_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("assessment_purchases")
          .select("context_progress")
          .eq("user_id", user.id)
          .is("consumed_at", null),
      ]);

      if (cancelled) return;

      if (ccRes.error) {
        console.error(
          "[ptp-context] coach_clients_client_view lookup failed",
          {
            client_user_id: user.id,
            instrument_id: ptpUuid ?? selectedInstrument.instrument_id,
            error: ccRes.error,
          },
        );
      }
      if (purchaseRes.error) {
        console.error(
          "[ptp-context] assessment_purchases lookup failed",
          { user_id: user.id, error: purchaseRes.error },
        );
      }

      const rows = (ccRes.error ? [] : ccRes.data ?? []) as Array<{ context_progress: string | null; preferred_first_context: string | null }>;
      const progresses = [
        ...rows.map((r) => r.context_progress),
        ...((purchaseRes.data ?? []) as Array<{ context_progress: string | null }>).map((r) => r.context_progress),
      ].filter(Boolean);

      if (progresses.includes("professional_done") && !progresses.includes("both_done")) {
        setContextType("personal");
        setPtpContextLoading(false);
        return;
      }
      if (progresses.includes("personal_done") && !progresses.includes("both_done")) {
        setContextType("professional");
        setPtpContextLoading(false);
        return;
      }

      const rec = rows.find((r) => r.preferred_first_context)?.preferred_first_context ?? null;
      if (rec === "professional" || rec === "personal" || rec === "both") {
        setPtpRecommended(rec);
      }
      setPtpContextLoading(false);
    })();

    return () => { cancelled = true; };
  }, [selectedInstrument, contextType]);


  const handleStartEpn = async (assignmentId: string) => {
    setEpnStarting(true);
    const { data: versionData } = await supabase
      .from("platform_versions")
      .select("version_string")
      .eq("is_active", true)
      .limit(1)
      .single();
    setEpnStarting(false);

    setSelectedInstrument({
      instrument_id: "INST-002L",
      instrument_name: "Executive Perspective NAI",
      instrument_version: versionData?.version_string || "1.0",
      short_name: "EPN",
      epnAssignmentId: assignmentId,
    });
  };

  const handleStartManagerAirsa = async (row: {
    manager_assessment_id: string;
    self_rater_full_name: string;
  }) => {
    const { data: versionData } = await supabase
      .from("platform_versions")
      .select("version_string")
      .eq("is_active", true)
      .limit(1)
      .single();

    setSelectedInstrument({
      instrument_id: "INST-003",
      instrument_name: "AI Readiness Skills Assessment",
      instrument_version: versionData?.version_string || "1.0",
      short_name: "AIRSA",
      preexistingAssessmentId: row.manager_assessment_id,
      raterType: "manager",
      targetUserName: row.self_rater_full_name,
    });
  };

  if (selectedInstrument) {
    if (selectedInstrument.instrument_id === "INST-001" && contextType === null) {
      if (ptpContextLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        );
      }
      return <PTPContextSelection onSelect={setContextType} recommended={ptpRecommended} />;
    }
    return (
      <AssessmentFlow
        instrument={selectedInstrument}
        contextType={contextType}
        entitlementSource={entitlementSource}
        preexistingAssessmentId={selectedInstrument.preexistingAssessmentId}
        epnAssignmentId={selectedInstrument.epnAssignmentId}
        raterType={selectedInstrument.raterType}
        targetUserName={selectedInstrument.targetUserName}
        onExit={() => {
          setSelectedInstrument(null);
          setContextType(null);
          setEntitlementSource(null);
          const next = new URLSearchParams(searchParams);
          next.delete("resumeInstrument");
          next.delete("resumeContext");
          next.delete("resumeSrc");
          setSearchParams(next, { replace: true });
        }}
      />
    );
  }

  const epnAssignments = epnAssignmentsQuery.data ?? [];
  const pendingManager = pendingManagerQuery.data ?? [];

  const formatDaysAgo = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  };

  return (
    <>
      {pendingManager.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pt-8 space-y-4">
          {pendingManager.map((row) => {
            const daysLabel = formatDaysAgo(row.self_completed_at);
            const dept = row.self_rater_department_name || "your team";
            const ctaLabel =
              row.manager_status === "in_progress" && row.reminder_count > 0
                ? "Continue Rating"
                : "Start Rating";
            return (
              <Card
                key={row.manager_assessment_id}
                className="bg-[var(--bw-cream)] border-l-4"
                style={{ borderLeftColor: "#2D6A4F" }}
              >
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      You've been asked to rate {row.self_rater_full_name}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {row.self_rater_full_name} from {dept} completed their AI Readiness Skills self-assessment {daysLabel}.
                      You'll be asked to rate the same 24 skills they rated themselves on. About 8 minutes.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AIRSA is a development conversation tool, not anonymous feedback. {row.self_rater_full_name} will see your readiness ratings (Foundational, Proficient, Advanced) for each skill — they won't see your specific Never/Rarely/Often/Consistently responses.
                  </p>
                  <Button
                    onClick={() => handleStartManagerAirsa(row)}
                    style={{ backgroundColor: "#2D6A4F" }}
                  >
                    {ctaLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {epnAssignments.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pt-8 space-y-4">
          {epnAssignments.map((a) => {
            const trimmedNotes = a.notes?.trim();
            return (
              <Card
                key={a.assignment_id}
                className="bg-[var(--bw-cream)] border-l-4"
                style={{ borderLeftColor: "var(--bw-orange)" }}
              >
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      You've been asked to complete the Executive Perspective NAI
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {a.organization_name} has asked you to complete a leader-perspective version of the NAI.
                      Your responses will help compare leader perception to employee experience. About 8-10 minutes.
                    </p>
                  </div>
                  {trimmedNotes && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                        Note from your administrator
                      </div>
                      <div className="text-sm text-foreground">{trimmedNotes}</div>
                    </div>
                  )}
                  <Button
                    onClick={() => handleStartEpn(a.assignment_id)}
                    disabled={epnStarting}
                    style={{ backgroundColor: "#F5741A" }}
                  >
                    {epnStarting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {a.status === "in_progress" ? "Continue Assessment" : "Start Assessment"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <InstrumentSelection
        onSelect={(payload) => {
          if (payload.contextType) setContextType(payload.contextType);
          if (payload.entitlementSource) setEntitlementSource(payload.entitlementSource);
          setSelectedInstrument(payload);
        }}
      />
    </>
  );
}

function PTPContextSelection({
  onSelect,
  recommended,
}: {
  onSelect: (ctx: 'professional' | 'personal' | 'both') => void;
  recommended?: 'professional' | 'personal' | 'both' | null;
}) {
  const cardClass = (ctx: 'professional' | 'personal' | 'both') =>
    `cursor-pointer transition-all hover:shadow-md ${
      recommended === ctx
        ? "border-accent border-2 ring-2 ring-accent/40 bg-accent/5 shadow-md"
        : "hover:border-accent/50"
    }`;

  const SuggestedBadge = () => (
    <span className="inline-block mb-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
      Suggested by your practitioner
    </span>
  );

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Personal Threat Profile</h1>
          <p className="text-muted-foreground">
            Before we begin, tell us which context you are completing this assessment for. You can complete the other half later.
          </p>
        </div>
        {recommended && (
          <div className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground">
            Your practitioner suggested starting with{" "}
            <strong>
              {recommended === "professional"
                ? "Corporate / Professional"
                : recommended === "personal"
                ? "Personal / Social"
                : "Both"}
            </strong>
            . You can still choose whichever you prefer.
          </div>
        )}
        <div className="grid gap-4">
          <Card className={cardClass('professional')} onClick={() => onSelect('professional')}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Corporate / Professional</h3>
              {recommended === 'professional' && <SuggestedBadge />}
              <p className="text-sm text-muted-foreground">
                Assess your threat responses in work and professional contexts.
              </p>
            </CardContent>
          </Card>
          <Card className={cardClass('personal')} onClick={() => onSelect('personal')}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Personal / Social</h3>
              {recommended === 'personal' && <SuggestedBadge />}
              <p className="text-sm text-muted-foreground">
                Assess your threat and reward responses in personal and social contexts.
              </p>
            </CardContent>
          </Card>
          <Card className={cardClass('both')} onClick={() => onSelect('both')}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Both</h3>
              {recommended === 'both' && <SuggestedBadge />}
              <p className="text-sm text-muted-foreground">
                Complete the full 89-question assessment covering all contexts.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

