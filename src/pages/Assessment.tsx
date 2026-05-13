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

const INSTRUMENT_ID_TO_SHORT_NAME: Record<string, string> = {
  "INST-001": "PTP",
  "INST-002": "NAI",
  "INST-003": "AIRSA",
  "INST-004": "HSS",
};

const INSTRUMENT_ID_TO_NAME: Record<string, string> = {
  "INST-001": "Personal Threat Profile",
  "INST-002": "Neuroscience Adoption Index",
  "INST-003": "AI Readiness Skills Assessment",
  "INST-004": "Habit Stabilization Scorecard",
};

interface SelectedInstrument {
  instrument_id: string;
  instrument_name: string;
  instrument_version: string;
  short_name: string;
  epnAssignmentId?: string;
  preexistingAssessmentId?: string;
  raterType?: 'self' | 'manager';
  targetUserName?: string;
}

export default function Assessment() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrument | null>(null);
  const [contextType, setContextType] = useState<'professional' | 'personal' | 'both' | null>(null);
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

    const shortName = INSTRUMENT_ID_TO_SHORT_NAME[instrumentId];
    const instrumentName = INSTRUMENT_ID_TO_NAME[instrumentId];
    if (!shortName || !instrumentName) return;

    const init = async () => {
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

      setSearchParams({}, { replace: true });
    };
    init();
  }, [searchParams, setSearchParams]);

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
      return <PTPContextSelection onSelect={setContextType} />;
    }
    return (
      <AssessmentFlow
        instrument={selectedInstrument}
        contextType={contextType}
        preexistingAssessmentId={selectedInstrument.preexistingAssessmentId}
        epnAssignmentId={selectedInstrument.epnAssignmentId}
        raterType={selectedInstrument.raterType}
        targetUserName={selectedInstrument.targetUserName}
        onExit={() => {
          setSelectedInstrument(null);
          setContextType(null);
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
      <InstrumentSelection onSelect={setSelectedInstrument} />
    </>
  );
}

function PTPContextSelection({
  onSelect,
}: {
  onSelect: (ctx: 'professional' | 'personal' | 'both') => void;
}) {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Personal Threat Profile</h1>
          <p className="text-muted-foreground">
            Before we begin, tell us which context you are completing this assessment for. You can complete the other half later.
          </p>
        </div>
        <div className="grid gap-4">
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onSelect('professional')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Corporate / Professional</h3>
              <p className="text-sm text-muted-foreground">
                Assess your threat responses in work and professional contexts.
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onSelect('personal')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Personal / Social</h3>
              <p className="text-sm text-muted-foreground">
                Assess your threat and reward responses in personal and social contexts.
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onSelect('both')}
          >
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Both</h3>
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
