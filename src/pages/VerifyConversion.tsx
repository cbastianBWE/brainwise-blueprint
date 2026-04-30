import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyConversion() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStage("error");
      setErrorMessage("Missing verification token. Please use the link from your email.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-conversion`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ token }),
          },
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          setErrorCode(json.code ?? null);
          setErrorMessage(json.error ?? "Verification failed.");
          setStage("error");
          return;
        }
        setNewEmail(json.new_email);
        setStage("success");
      } catch (err: any) {
        setErrorMessage(err.message ?? "Network error.");
        setStage("error");
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F1] p-6">
      <Card className="w-full max-w-[600px] shadow-lg">
        <CardContent className="p-8">
          {stage === "verifying" && (
            <div className="flex flex-col items-center text-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h1 className="text-2xl font-semibold">Verifying your account transfer...</h1>
              <p className="text-muted-foreground">This will only take a moment.</p>
            </div>
          )}

          {stage === "success" && (
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <h1 className="text-2xl font-semibold">Your account has been transferred</h1>
              <p className="text-muted-foreground">
                Your BrainWise account is now associated with{" "}
                <span className="font-medium text-foreground">{newEmail}</span>. Sign in below to
                access your assessment history.
              </p>
              <Button onClick={() => navigate("/login")} className="mt-4">
                Go to sign in
              </Button>
            </div>
          )}

          {stage === "error" && (
            <div className="flex flex-col items-center text-center gap-4">
              <XCircle className="h-10 w-10 text-destructive" />
              <h1 className="text-2xl font-semibold">Verification failed</h1>
              <p className="text-muted-foreground">
                {errorCode === "TOKEN_EXPIRED"
                  ? "This verification link has expired. Please go back to BrainWise, cancel the pending conversion, and request a new link."
                  : errorCode === "TOKEN_INVALID"
                    ? "This link is no longer valid. It may have already been used, or it was cancelled."
                    : errorCode === "ALREADY_CONVERTED"
                      ? "This account has already been transferred. Try signing in."
                      : errorMessage}
              </p>
              <Button onClick={() => navigate("/login")} className="mt-4">
                Go to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
