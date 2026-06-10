import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MyResults from "@/pages/MyResults";
import { CoachClientPlan } from "@/components/development-plan/CoachClientPlan";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, FileText, Loader2, Search, AlertCircle } from "lucide-react";

interface ClientInfo {
  id: string;
  full_name: string | null;
  email: string;
}

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

export default function ClientResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const userId = searchParams.get("user_id") ?? "";
  const assessmentId = searchParams.get("assessment_id") ?? "";

  // State 3: Full results view
  if (userId && assessmentId) {
    return (
      <CoachResultsView
        userId={userId}
        assessmentId={assessmentId}
        coachUserId={user?.id ?? ""}
        onBack={() => {
          const next = new URLSearchParams(searchParams);
          next.delete("assessment_id");
          setSearchParams(next);
        }}
      />
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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchClients = async () => {
    if (!coachUserId) return;
    setLoading(true);
    setError(null);
    try {
      // Get all coach_clients rows for this coach
      const { data: rows, error: rowsError } = await supabase
        .from("coach_clients")
        .select("client_user_id")
        .eq("coach_user_id", coachUserId);
      if (rowsError) throw new Error(rowsError.message);

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
        return;
      }

      // Fetch user info for each unique client
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", uniqueIds);
      if (usersError) throw new Error(usersError.message);

      setClients(users ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load clients";
      setError(msg);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachUserId]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex justify-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          role="status"
          aria-label="Loading clients"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Client Results</h1>
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-center">
            Couldn't load clients: {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchClients}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = clients.filter(
    (c) =>
      (c.full_name ?? "").toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Client Results</h1>
      {clients.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {clients.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          No clients found. Add clients from the{" "}
          <span className="font-medium">Clients</span> page first.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          No clients match your search.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSelect(c.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <User className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
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
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    if (!clientUserId || !coachUserId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch client info + share preference
      const { data: clientData, error: clientErr } = await supabase
        .from("users")
        .select("full_name, share_results_with_coach")
        .eq("id", clientUserId)
        .single();
      if (clientErr) throw new Error(clientErr.message);

      setClientName(clientData?.full_name || "Client");
      const shareWithCoach = clientData?.share_results_with_coach ?? false;

      let resultRows: { assessment_id: string; instrument_id: string | null; created_at: string }[] = [];

      if (shareWithCoach) {
        // Show all completed results
        const { data, error: arErr } = await supabase
          .from("assessment_results")
          .select("assessment_id, instrument_id, created_at")
          .eq("user_id", clientUserId)
          .order("created_at", { ascending: false });
        if (arErr) throw new Error(arErr.message);
        resultRows = data ?? [];
      } else {
        // Only show results linked via coach_clients (include paired_assessment_id for PTP)
        const { data: linked, error: linkedErr } = await supabase
          .from("coach_clients")
          .select("assessment_id, paired_assessment_id")
          .eq("coach_user_id", coachUserId)
          .eq("client_user_id", clientUserId);
        if (linkedErr) throw new Error(linkedErr.message);

        const linkedIds = [
          ...new Set(
            (linked ?? [])
              .flatMap((r) => [r.assessment_id, r.paired_assessment_id])
              .filter((id): id is string => !!id)
          ),
        ];

        if (linkedIds.length > 0) {
          const { data, error: arErr2 } = await supabase
            .from("assessment_results")
            .select("assessment_id, instrument_id, created_at")
            .eq("user_id", clientUserId)
            .in("assessment_id", linkedIds)
            .order("created_at", { ascending: false });
          if (arErr2) throw new Error(arErr2.message);
          resultRows = data ?? [];
        }
      }

      // Fetch instrument names + assessment context/pairing for display
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

      // Build raw enriched entries
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

      // Group paired PTPs: collapse (professional, personal) pairs whose paired_assessment_id mutually references each other
      // into ONE entry keyed on the professional assessment_id. Two professional retakes will NOT collapse (their
      // paired_assessment_id points at a personal row, not at each other).
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

      // Re-sort by completed_at desc (grouping may have shifted dates)
      grouped.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

      setAssessments(grouped);
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
  }, [clientUserId, coachUserId]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex justify-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          role="status"
          aria-label="Loading assessments"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Back to clients
        </Button>
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-center">
            Couldn't load assessments: {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchAssessments}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Back to clients
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
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.instrument_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.isPTP && a.isPairedPTP
                      ? `Professional + Personal · ${new Date(a.completed_at).toLocaleDateString()}`
                      : a.isPTP && (a.context_type === 'professional' || a.context_type === 'personal')
                      ? `${a.context_type === 'professional' ? 'Professional' : 'Personal'} · ${new Date(a.completed_at).toLocaleDateString()}`
                      : new Date(a.completed_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <CoachClientPlan clientUserId={clientUserId} />
      </div>
    </div>
  );
}

/* ───── Level 3: Coach Results View (permission resolver) ───── */

function CoachResultsView({
  userId,
  assessmentId,
  coachUserId,
  onBack,
}: {
  userId: string;
  assessmentId: string;
  coachUserId: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [permissionLevel, setPermissionLevel] = useState<'full_results' | 'score_summary' | null>(null);
  const [permLoading, setPermLoading] = useState(true);
  const [permError, setPermError] = useState<string | null>(null);

  const resolvePermission = async () => {
    if (!userId || !assessmentId || !coachUserId) return;
    setPermLoading(true);
    setPermError(null);
    try {
      // Check if assessment was ordered through coach flow (match either assessment_id or paired_assessment_id for PTP)
      const { data: coachClient, error: ccError } = await supabase
        .from("coach_clients")
        .select("id")
        .eq("coach_user_id", coachUserId)
        .or(`assessment_id.eq.${assessmentId},paired_assessment_id.eq.${assessmentId}`)
        .maybeSingle();
      if (ccError) throw new Error(ccError.message);

      if (coachClient) {
        setPermissionLevel("full_results");
        return;
      }

      // Fallback: check permissions table
      const { data: perm, error: permErr } = await supabase
        .from("permissions")
        .select("permission_level")
        .eq("owner_user_id", userId)
        .eq("viewer_user_id", coachUserId)
        .maybeSingle();
      if (permErr) throw new Error(permErr.message);

      const level = perm?.permission_level as 'full_results' | 'score_summary' | null;
      setPermissionLevel(level ?? "score_summary");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resolve viewing permission";
      setPermError(msg);
    } finally {
      setPermLoading(false);
    }
  };

  useEffect(() => {
    resolvePermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, assessmentId, coachUserId]);

  if (permLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex justify-center py-20">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          role="status"
          aria-label="Loading client results"
        />
      </div>
    );
  }

  if (permError) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Back
        </Button>
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-center">
            Couldn't load client results: {permError}
          </p>
          <Button variant="outline" size="sm" onClick={resolvePermission}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Back
      </Button>
      <MyResults
        isCoachView
        targetUserId={userId}
        preSelectedAssessmentId={assessmentId}
        coachUserId={coachUserId}
        permissionLevel={permissionLevel}
      />
    </div>
  );
}
