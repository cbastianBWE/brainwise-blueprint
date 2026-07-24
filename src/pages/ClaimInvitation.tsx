import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { stashInviteToken, claimPendingCoachInvite } from "@/lib/coachInviteClaim";

export default function ClaimInvitation() {
  const { token } = useParams<{ token: string }>();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [, setWorking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!token) { navigate("/", { replace: true }); return; }

    stashInviteToken(token);

    (async () => {
      if (session) {
        const ok = await claimPendingCoachInvite({ silent: false });
        navigate(ok ? "/my-results" : "/dashboard", { replace: true });
      } else {
        navigate("/signup?claim=1", { replace: true });
      }
    })().finally(() => setWorking(false));
  }, [loading, session, token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
