import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const MfaEnrollment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('identity-mutation', {
        body: { action: 'mfa_enroll' },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setFactorId(result.factor_id);
      setQrSvg(result.qr_code);
      setSecret(result.secret);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start enrollment");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      await queryClient.invalidateQueries({ queryKey: ["mfa-satisfied", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["mfa-required", user?.id] });
      toast.success("Two-factor authentication enabled");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <CardTitle className="text-2xl">Set up two-factor authentication</CardTitle>
          <CardDescription>
            Your organization requires two-factor authentication for all users. Set up an
            authenticator app to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!factorId && (
            <Button className="w-full" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? "Generating..." : "Generate setup code"}
            </Button>
          )}

          {factorId && qrSvg && (
            <>
              <div className="flex justify-center bg-white p-4 rounded-md border">
                <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>
              {secret && (
                <div className="space-y-2">
                  <Label>Or enter this secret manually</Label>
                  <div className="flex gap-2">
                    <Input value={secret} readOnly className="font-mono text-xs" />
                    <Button type="button" size="icon" variant="outline" onClick={copySecret}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <form onSubmit={handleVerify} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
                  {verifying ? "Verifying..." : "Verify and continue"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MfaEnrollment;
