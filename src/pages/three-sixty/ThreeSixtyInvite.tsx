// The rater's path. A public page reached from an emailed link. The rater is
// not a member of anything, so the page has to hold their invitation through
// signing up and still open the right questions afterwards.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnswerFlow } from "@/pages/coaching/three-sixty/AnswerFlow";

const TOKEN_KEY = "bw_360_invite_token";

interface PublicInfo {
  valid: boolean;
  reason?: string;
  already_submitted?: boolean;
  invitee_name?: string;
  subject_first_name?: string;
  question_count?: number;
}

function reasonMessage(reason?: string) {
  switch (reason) {
    case "expired":
      return "This invitation has expired. If you would still like to answer, ask the person who invited you to send a new link.";
    case "withdrawn":
      return "This invitation was withdrawn.";
    case "not_collecting":
      return "This 360 is closed, so answers are no longer being collected.";
    default:
      return "This link is not valid. Please use the link from the email you were sent.";
  }
}

export default function ThreeSixtyInvite() {
  const [params] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [working, setWorking] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  // The token survives the round trip through signup.
  useEffect(() => {
    const t = params.get("token") || sessionStorage.getItem(TOKEN_KEY);
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, [params]);

  useEffect(() => {
    if (token === null) return;
    let cancelled = false;
    (async () => {
      setChecking(true);
      const { data, error } = await supabase.rpc("bw_360_invite_public_info", { p_token: token });
      if (cancelled) return;
      setInfo(error ? { valid: false } : ((data || { valid: false }) as PublicInfo));
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Claiming is idempotent, so returning to the link after answering half the
  // questions reopens the same submission rather than starting a new one.
  useEffect(() => {
    if (!token || !session || !info?.valid || info.already_submitted || submissionId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("bw_360_claim_invite", { p_token: token });
      if (cancelled) return;
      if (error) {
        setClaimError("This invitation could not be opened.");
        return;
      }
      const res = (data || {}) as { ok?: boolean; error?: string; submission_id?: string };
      if (!res.ok || !res.submission_id) {
        setClaimError(
          res.error === "cannot_rate_yourself"
            ? "This is your own 360, so you cannot answer it as someone else."
            : res.error === "already_claimed"
              ? "This invitation belongs to a different account. Sign in with the address the invitation was sent to."
              : reasonMessage(res.error),
        );
        return;
      }
      sessionStorage.removeItem(TOKEN_KEY);
      setSubmissionId(res.submission_id);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, session, info, submissionId]);

  const redirectUrl = `${window.location.origin}/360/invite${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  const doSignUp = async () => {
    setWorking(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName.trim() } },
    });
    setWorking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) setCheckEmail(true);
  };

  const doSignIn = async () => {
    setWorking(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setWorking(false);
    if (error) toast.error(error.message);
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto w-full max-w-2xl py-8">{children}</div>
    </div>
  );

  if (checking || authLoading) {
    return shell(
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your invitation…
      </div>,
    );
  }

  if (!info?.valid) {
    return shell(
      <Card className="space-y-2 p-6">
        <h1 className="text-lg font-semibold">This 360 invitation cannot be opened</h1>
        <p className="text-sm text-muted-foreground">{reasonMessage(info?.reason)}</p>
      </Card>,
    );
  }

  if (info.already_submitted) {
    return shell(
      <Card className="space-y-2 p-6">
        <h1 className="text-lg font-semibold">Thank you, your answers are already in</h1>
        <p className="text-sm text-muted-foreground">
          Answers are final once submitted, so there is nothing more to do here.
        </p>
      </Card>,
    );
  }

  const subject = info.subject_first_name || "your colleague";

  if (!session) {
    return shell(
      <div className="space-y-4">
        <Card className="space-y-2 p-6">
          <h1 className="text-lg font-semibold">
            {info.invitee_name ? `${info.invitee_name}, ` : ""}
            {subject} has asked for your view
          </h1>
          <p className="text-sm text-muted-foreground">
            There {info.question_count === 1 ? "is" : "are"} {info.question_count ?? ""} question
            {info.question_count === 1 ? "" : "s"}. {subject} will read the themes across everyone who
            answered. They will not see your name against anything you say.
          </p>
          <p className="text-sm text-muted-foreground">
            You need an account so that your answers can be saved and so that nobody can answer twice.
          </p>
        </Card>

        {checkEmail ? (
          <Card className="space-y-2 p-6">
            <h2 className="text-base font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              Open the link we just sent you and you will come straight back to these questions.
            </p>
          </Card>
        ) : (
          <Card className="space-y-4 p-6">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "signup" ? "default" : "outline"}
                onClick={() => setMode("signup")}
              >
                Create an account
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "signin" ? "default" : "outline"}
                onClick={() => setMode("signin")}
              >
                I already have one
              </Button>
            </div>

            {mode === "signup" && (
              <div className="space-y-1">
                <Label htmlFor="inv-name">Your name</Label>
                <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="inv-email">Email</Label>
              <Input
                id="inv-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-pass">Password</Label>
              <Input
                id="inv-pass"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={working || !email.trim() || !password}
              onClick={mode === "signup" ? doSignUp : doSignIn}
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signup" ? "Create my account and start" : "Sign in and start"}
            </Button>
          </Card>
        )}
      </div>,
    );
  }

  if (claimError) {
    return shell(
      <Card className="space-y-2 p-6">
        <h1 className="text-lg font-semibold">This 360 invitation cannot be opened</h1>
        <p className="text-sm text-muted-foreground">{claimError}</p>
      </Card>,
    );
  }

  if (!submissionId) {
    return shell(
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening your questions…
      </div>,
    );
  }

  return shell(
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Your view of {subject}</h1>
        <p className="text-sm text-muted-foreground">
          {subject} sees the themes across everyone who answered, never your name against your words.
          Your answers are final once you submit them.
        </p>
      </div>
      <AnswerFlow submissionId={submissionId} />
    </div>,
  );
}
