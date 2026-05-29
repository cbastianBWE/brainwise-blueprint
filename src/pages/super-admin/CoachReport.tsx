import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MyResults from "@/pages/MyResults";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, AlertCircle } from "lucide-react";

interface AssessmentInfo {
  assessment_id: string;
  instrument_id: string | null;
  instrument_name: string;
  completed_at: string;
  context_type: 'professional' | 'personal' | 'both' | null;
  paired_assessment_id: string | null;
  isPTP: boolean;
  isPairedPTP: boolean;
}

export default function CoachReport() {
  const { coachUserId = "" } = useParams<{ coachUserId: string }>();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment_id") ?? "";

  if (assessmentId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete("assessment_id");
            setSearchParams(next);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Back to coach reports
        </Button>
        <MyResults
          isCoachView
          targetUserId={coachUserId}
          preSelectedAssessmentId={assessmentId}
          coachUserId={user?.id ?? ""}
          permissionLevel="full_results"
        />
      </div>
    );
  }

  return (
    <CoachAssessmentList
      coachUserId={coachUserId}
      onSelect={(aId) => {
        const next = new URLSearchParams(searchParams);
        next.set("assessment_id", aId);
        setSearchParams(next);
      }}
    />
  );
}

function CoachAssessmentList({
  coachUserId,
  onSelect,
}: {
  coachUserId: string;
  onSelect: (assessmentId: string) => void;
}) {
  const [assessments, setAssessments] = useState<AssessmentInfo[]>([]);
  const [coachName, setCoachName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    if (!coachUserId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: coachData, error: cErr } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", coachUserId)
        .single();
      if (cErr) throw new Error(cErr.message);
      setCoachName(coachData?.full_name || "Coach");

      const { data: resultRowsRaw, error: arErr } = await supabase
        .from("assessment_results")
        .select("assessment_id, instrument_id, created_at")
        .eq("user_id", coachUserId)
        .order("created_at", { ascending: false });
      if (arErr) throw new Error(arErr.message);
      const resultRows = resultRowsRaw ?? [];

      const instrumentIds = [
        ...new Set(resultRows.map((r) => r.instrument_id).filter(Boolean)),
      ];
      let instrumentMap: Record<string, string> = {};
      if (instrumentIds.length > 0) {
        const { data: instruments, error: instErr } = await supabase
          .from("instruments")
          .select("instrument_id, instrument_name")
          .in("instrument_id", instrumentIds as string[]);
        if (instErr) throw new Error(instErr.message);
        instrumentMap = Object.fromEntries(
          (instruments ?? []).map((i) => [i.instrument_id, i.instrument_name])
        );
      }

      const fetchedAssessmentIds = resultRows.map((r) => r.assessment_id);
      let assessmentMeta: Record<string, { context_type: string | null; paired_assessment_id: string | null }> = {};
      if (fetchedAssessmentIds.length > 0) {
        const { data: aRows, error: aErr } = await supabase
          .from("assessments")
          .select("id, context_type, paired_assessment_id")
          .in("id", fetchedAssessmentIds);
        if (aErr) throw new Error(aErr.message);
        assessmentMeta = Object.fromEntries(
          (aRows ?? []).map((a) => [a.id, { context_type: a.context_type ?? null, paired_assessment_id: a.paired_assessment_id ?? null }])
        );
      }

      const fetchedIdSet = new Set(fetchedAssessmentIds);
      const rawEntries: AssessmentInfo[] = resultRows.map((r) => {
        const meta = assessmentMeta[r.assessment_id];
        const isPTP = (r.instrument_id ?? "").toUpperCase().includes("INST-001");
        return {
          assessment_id: r.assessment_id,
          instrument_id: r.instrument_id,
          instrument_name:
            (r.instrument_id && instrumentMap[r.instrument_id]) || "Assessment",
          completed_at: r.created_at,
          context_type: (meta?.context_type as AssessmentInfo['context_type']) ?? null,
          paired_assessment_id: meta?.paired_assessment_id ?? null,
          isPTP,
          isPairedPTP: false,
        };
      });

      const consumed = new Set<string>();
      const grouped: AssessmentInfo[] = [];
      for (const e of rawEntries) {
        if (consumed.has(e.assessment_id)) continue;
        if (
          e.isPTP &&
          e.paired_assessment_id &&
          fetchedIdSet.has(e.paired_assessment_id) &&
          (e.context_type === 'professional' || e.context_type === 'personal')
        ) {
          const partner = rawEntries.find(
            (p) =>
              p.assessment_id === e.paired_assessment_id &&
              p.isPTP &&
              p.paired_assessment_id === e.assessment_id &&
              (p.context_type === 'professional' || p.context_type === 'personal') &&
              p.context_type !== e.context_type
          );
          if (partner) {
            const pro = e.context_type === 'professional' ? e : partner;
            const per = e.context_type === 'personal' ? e : partner;
            const latest = new Date(pro.completed_at) >= new Date(per.completed_at) ? pro.completed_at : per.completed_at;
            grouped.push({
              ...pro,
              completed_at: latest,
              context_type: 'both',
              isPairedPTP: true,
            });
            consumed.add(pro.assessment_id);
            consumed.add(per.assessment_id);
            continue;
          }
        }
        grouped.push(e);
        consumed.add(e.assessment_id);
      }

      grouped.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

      // Only PTP entries are relevant for the certification debrief view
      const ptpOnly = grouped.filter((g) => g.isPTP);
      setAssessments(ptpOnly);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load assessments";
      setError(msg);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachUserId]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" role="status" aria-label="Loading reports" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-center">
            Couldn't load reports: {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchAssessments}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{coachName}</h1>
      <p className="text-muted-foreground mb-6">Completed PTP reports</p>

      {assessments.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          No completed PTP reports for this coach.
        </p>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <Card
              key={a.assessment_id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSelect(a.assessment_id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.instrument_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.isPairedPTP
                      ? `Professional + Personal · ${new Date(a.completed_at).toLocaleDateString()}`
                      : a.context_type === 'professional' || a.context_type === 'personal'
                      ? `${a.context_type === 'professional' ? 'Professional' : 'Personal'} · ${new Date(a.completed_at).toLocaleDateString()}`
                      : new Date(a.completed_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
