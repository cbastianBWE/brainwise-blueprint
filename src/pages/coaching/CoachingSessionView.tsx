import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, RotateCcw, Share2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SynthesisView,
  AiAnalysisPanel,
  ChatTranscript,
  type Responses,
} from "@/components/coaching/CoachingViews";

interface SessionRow {
  id: string;
  activity_id: string;
  user_id: string;
  status: string;
  responses: Responses | null;
  completed_at: string | null;
  coaching_activities: { title: string; tier: string | null; definition: any } | null;
}

export default function CoachingSessionView() {
  const imgUrl = (path: string, w: number, h: number) =>
    supabase.storage
      .from("coaching-media")
      .getPublicUrl(path, { transform: { width: w, height: h, resize: "cover" } })
      .data.publicUrl;

  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [coachUserId, setCoachUserId] = useState<string | null>(null);
  const [existingShareId, setExistingShareId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!user || !sessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("coaching_activity_sessions")
        .select(
          "id, activity_id, user_id, status, responses, completed_at, coaching_activities(title, tier, definition)",
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      setSession((data as unknown as SessionRow) || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, sessionId]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cc } = await supabase
        .from("coach_clients")
        .select("coach_user_id")
        .eq("client_user_id", user.id)
        .limit(1)
        .maybeSingle();
      const cid = cc?.coach_user_id || null;
      setCoachUserId(cid);
      if (!cid) return;
      const { data: shares } = await supabase
        .from("coaching_activity_shares")
        .select("id,revoked_at")
        .eq("owner_user_id", user.id)
        .eq("viewer_user_id", cid)
        .is("revoked_at", null)
        .limit(1);
      const first = (shares || [])[0];
      setExistingShareId(first ? (first as any).id : null);
    })();
  }, [user]);

  const shareWithCoach = async () => {
    if (!user || !coachUserId) return;
    setSharing(true);
    try {
      const { data, error } = await supabase
        .from("coaching_activity_shares")
        .insert({
          owner_user_id: user.id,
          viewer_user_id: coachUserId,
          mode: "snapshot",
        })
        .select("id")
        .single();
      if (error) {
        toast.error("Couldn't share with your coach.");
        return;
      }
      setExistingShareId((data as any).id);
      toast.success("Shared with your coach.");
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-10 text-center">
            <h2 className="text-base font-semibold">Session not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This coaching session doesn't exist or you don't have access to it.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/coaching">
                <ArrowLeft className="h-4 w-4" />
                Back to My Coaching
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const responses = (session.responses || {}) as Responses;
  const analysisHtml = responses.analysis?.html;
  const chat = responses.chat || [];
  const pictureGroups = Object.values(responses).filter(
    (v): v is Array<{ storage_path: string; tag?: string }> =>
      Array.isArray(v) &&
      v.length > 0 &&
      v.every(
        (it) =>
          it && typeof it === "object" && typeof (it as any).storage_path === "string",
      ),
  );
  const title = session.coaching_activities?.title || "Coaching session";
  const tier = session.coaching_activities?.tier || null;
  const completed = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/coaching">
            <ArrowLeft className="h-4 w-4" />
            My Coaching
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {tier && <Badge variant="outline">{tier}</Badge>}
          {completed && (
            <span className="text-xs text-muted-foreground">Completed {completed}</span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your responses</CardTitle>
        </CardHeader>
        <CardContent>
          {pictureGroups.map((group, gi) => (
            <div key={gi} className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Your pictures</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {group.map((img) => (
                  <figure key={img.storage_path} className="space-y-1">
                    <img
                      src={imgUrl(img.storage_path, 400, 400)}
                      alt={img.tag || ""}
                      loading="lazy"
                      className="aspect-square w-full rounded-md object-cover"
                    />
                    {img.tag && (
                      <figcaption className="truncate text-xs text-muted-foreground">
                        {img.tag}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          ))}
          <SynthesisView responses={responses} steps={session.coaching_activities?.definition?.steps} />
        </CardContent>
      </Card>

      {analysisHtml && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coaching plan</CardTitle>
          </CardHeader>
          <CardContent>
            <AiAnalysisPanel html={analysisHtml} />
          </CardContent>
        </Card>
      )}

      {chat.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chat transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatTranscript chat={chat} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={() => navigate(`/coaching/${session.activity_id}?fresh=1`)}>
          <RotateCcw className="h-4 w-4" />
          Do it again
        </Button>
        {coachUserId && (
          <Button
            variant="outline"
            onClick={shareWithCoach}
            disabled={!!existingShareId || sharing}
          >
            {existingShareId ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Shared
              </>
            ) : (
              <>
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                Share with my coach
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
