import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MyResults from "@/pages/MyResults";
import { CoachClientPlan } from "@/components/development-plan/CoachClientPlan";
import CoachClientCoaching from "@/components/coaching/CoachClientCoaching";
import CoachClientChat from "@/components/coach/CoachClientChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Search, Users } from "lucide-react";
import { format } from "date-fns";

interface Member {
  member_user_id: string;
  full_name: string | null;
  email: string;
  organization_id: string;
  organization_name: string;
}
interface Result {
  assessment_id: string;
  instrument_id: string | null;
  instrument_name: string;
  created_at: string;
}

const INSTRUMENT_NAME: Record<string, string> = {
  "INST-001": "PTP",
  "INST-002": "NAI",
  "INST-003": "AIRSA",
  "INST-004": "HSS",
};

export default function OrgMembers() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const memberId = searchParams.get("user_id") ?? "";
  const assessmentId = searchParams.get("assessment_id") ?? "";

  if (memberId && assessmentId) {
    return (
      <MemberReport
        memberId={memberId}
        assessmentId={assessmentId}
        coachUserId={user?.id ?? ""}
        onBack={() => {
          const n = new URLSearchParams(searchParams);
          n.delete("assessment_id");
          setSearchParams(n);
        }}
      />
    );
  }
  if (memberId) {
    return (
      <MemberAssessments
        memberId={memberId}
        onSelect={(aid) => {
          const n = new URLSearchParams(searchParams);
          n.set("assessment_id", aid);
          setSearchParams(n);
        }}
        onBack={() => {
          const n = new URLSearchParams(searchParams);
          n.delete("user_id");
          setSearchParams(n);
        }}
      />
    );
  }
  return (
    <MemberList
      onSelect={(id) => {
        const n = new URLSearchParams(searchParams);
        n.set("user_id", id);
        setSearchParams(n);
      }}
    />
  );
}

function MemberList({ onSelect }: { onSelect: (memberId: string) => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.rpc as any)("coach_list_org_members");
      setMembers((data as Member[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = members.filter(m =>
      !s || (m.full_name ?? "").toLowerCase().includes(s) || m.email.toLowerCase().includes(s)
    );
    const by: Record<string, Member[]> = {};
    for (const m of filtered) (by[m.organization_name] ??= []).push(m);
    return by;
  }, [members, q]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Organization Members
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Members of organizations you coach. Open anyone to view their results, plan, and coaching.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You're not assigned to any organizations yet. A BrainWise admin assigns organization coaches.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          {Object.entries(grouped).map(([orgName, list]) => (
            <Card key={orgName}>
              <CardHeader>
                <CardTitle className="text-lg">{orgName}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map(m => (
                      <TableRow key={m.member_user_id}>
                        <TableCell>{m.full_name || "—"}</TableCell>
                        <TableCell>{m.email}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => onSelect(m.member_user_id)}>
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

function MemberAssessments({
  memberId, onSelect, onBack,
}: { memberId: string; onSelect: (aid: string) => void; onBack: () => void; }) {
  const [results, setResults] = useState<Result[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: u }, { data: rows }] = await Promise.all([
        supabase.from("users").select("full_name, email").eq("id", memberId).maybeSingle(),
        supabase.from("assessment_results")
          .select("assessment_id, instrument_id, created_at")
          .eq("user_id", memberId)
          .order("created_at", { ascending: false }),
      ]);
      setName(((u as any)?.full_name) || ((u as any)?.email) || "Member");
      const list = (((rows as any[]) ?? []).map(r => ({
        assessment_id: r.assessment_id,
        instrument_id: r.instrument_id,
        instrument_name: INSTRUMENT_NAME[r.instrument_id ?? ""] ?? (r.instrument_id ?? "Assessment"),
        created_at: r.created_at,
      }))) as Result[];
      setResults(list);
      setLoading(false);
    })();
  }, [memberId]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Button>
      <h1 className="text-2xl font-bold">{name}</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This member has no completed assessments yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(r => (
                  <TableRow key={r.assessment_id}>
                    <TableCell>{r.instrument_name}</TableCell>
                    <TableCell>{r.created_at ? format(new Date(r.created_at), "MMM d, yyyy") : ""}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onSelect(r.assessment_id)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MemberReport({
  memberId, assessmentId, coachUserId, onBack,
}: { memberId: string; assessmentId: string; coachUserId: string; onBack: () => void; }) {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="plan">Development Plan</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="ask-ai">Ask AI</TabsTrigger>
        </TabsList>
        <TabsContent value="results" className="mt-4">
          <MyResults
            isCoachView
            targetUserId={memberId}
            preSelectedAssessmentId={assessmentId}
            coachUserId={coachUserId}
            permissionLevel="full_results"
          />
        </TabsContent>
        <TabsContent value="plan" className="mt-4">
          <CoachClientPlan clientUserId={memberId} />
        </TabsContent>
        <TabsContent value="coaching" className="mt-4">
          <CoachClientCoaching clientUserId={memberId} />
        </TabsContent>
        <TabsContent value="ask-ai" className="mt-4">
          <CoachClientChat subjectUserId={memberId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
