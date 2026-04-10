import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MyResults from "@/pages/MyResults";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, FileText, Loader2 } from "lucide-react";

interface ClientInfo {
  id: string;
  full_name: string | null;
  email: string;
}

interface AssessmentInfo {
  assessment_id: string;
  instrument_name: string;
  completed_at: string;
}

export default function ClientResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const userId = searchParams.get("user_id") ?? "";
  const assessmentId = searchParams.get("assessment_id") ?? "";

  // State 3: Full results view
  if (userId && assessmentId) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
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
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to assessments
        </Button>
        <MyResults
          isCoachView
          targetUserId={userId}
          preSelectedAssessmentId={assessmentId}
          coachUserId={user?.id}
        />
      </div>
    );
  }

  // State 2: Assessment list
  if (userId) {
    return (
      <AssessmentList
        clientUserId={userId}
        coachUserId={user?.id ?? ""}
        onSelect={(aId) => {
          const next = new URLSearchParams(searchParams);
          next.set("assessment_id", aId);
          setSearchParams(next);
        }}
        onBack={() => {
          const next = new URLSearchParams(searchParams);
          next.delete("user_id");
          setSearchParams(next);
        }}
      />
    );
  }

  // State 1: Client list
  return (
    <ClientList
      coachUserId={user?.id ?? ""}
      onSelect={(cId) => {
        setSearchParams({ user_id: cId });
      }}
    />
  );
}

/* ───── Level 1: Client List ───── */

function ClientList({
  coachUserId,
  onSelect,
}: {
  coachUserId: string;
  onSelect: (clientUserId: string) => void;
}) {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachUserId) return;
    (async () => {
      setLoading(true);
      // Get all coach_clients rows for this coach
      const { data: rows } = await supabase
        .from("coach_clients")
        .select("client_user_id")
        .eq("coach_user_id", coachUserId);

      // Deduplicate and filter out null client_user_ids
      const uniqueIds = [
        ...new Set(
          (rows ?? [])
            .map((r) => r.client_user_id)
            .filter((id): id is string => !!id)
        ),
      ];

      if (uniqueIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Fetch user info for each unique client
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", uniqueIds);

      setClients(users ?? []);
      setLoading(false);
    })();
  }, [coachUserId]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Client Results</h1>
      {clients.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          No clients found. Add clients from the{" "}
          <span className="font-medium">Clients</span> page first.
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSelect(c.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <User className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {c.full_name || "Unnamed"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.email}
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

/* ───── Level 2: Assessment List ───── */

function AssessmentList({
  clientUserId,
  coachUserId,
  onSelect,
  onBack,
}: {
  clientUserId: string;
  coachUserId: string;
  onSelect: (assessmentId: string) => void;
  onBack: () => void;
}) {
  const [assessments, setAssessments] = useState<AssessmentInfo[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientUserId || !coachUserId) return;
    (async () => {
      setLoading(true);

      // Fetch client info + share preference
      const { data: clientData } = await supabase
        .from("users")
        .select("full_name, share_results_with_coach")
        .eq("id", clientUserId)
        .single();

      setClientName(clientData?.full_name || "Client");
      const shareWithCoach = clientData?.share_results_with_coach ?? false;

      let resultRows: { assessment_id: string; instrument_id: string | null; created_at: string }[] = [];

      if (shareWithCoach) {
        // Show all completed results
        const { data } = await supabase
          .from("assessment_results")
          .select("assessment_id, instrument_id, created_at")
          .eq("user_id", clientUserId)
          .order("created_at", { ascending: false });
        resultRows = data ?? [];
      } else {
        // Only show results linked via coach_clients
        const { data: linked } = await supabase
          .from("coach_clients")
          .select("assessment_id")
          .eq("coach_user_id", coachUserId)
          .eq("client_user_id", clientUserId)
          .not("assessment_id", "is", null);

        const linkedIds = (linked ?? [])
          .map((r) => r.assessment_id)
          .filter((id): id is string => !!id);

        if (linkedIds.length > 0) {
          const { data } = await supabase
            .from("assessment_results")
            .select("assessment_id, instrument_id, created_at")
            .eq("user_id", clientUserId)
            .in("assessment_id", linkedIds)
            .order("created_at", { ascending: false });
          resultRows = data ?? [];
        }
      }

      // Fetch instrument names for display
      const instrumentIds = [
        ...new Set(resultRows.map((r) => r.instrument_id).filter(Boolean)),
      ];
      let instrumentMap: Record<string, string> = {};
      if (instrumentIds.length > 0) {
        const { data: instruments } = await supabase
          .from("instruments")
          .select("instrument_id, instrument_name")
          .in("instrument_id", instrumentIds as string[]);
        instrumentMap = Object.fromEntries(
          (instruments ?? []).map((i) => [i.instrument_id, i.instrument_name])
        );
      }

      setAssessments(
        resultRows.map((r) => ({
          assessment_id: r.assessment_id,
          instrument_name:
            (r.instrument_id && instrumentMap[r.instrument_id]) ||
            "Assessment",
          completed_at: r.created_at,
        }))
      );
      setLoading(false);
    })();
  }, [clientUserId, coachUserId]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to clients
      </Button>
      <h1 className="text-2xl font-bold mb-1">{clientName}</h1>
      <p className="text-muted-foreground mb-6">Completed assessments</p>

      {assessments.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          No viewable assessments for this client.
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
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.instrument_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(a.completed_at).toLocaleDateString()}
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
