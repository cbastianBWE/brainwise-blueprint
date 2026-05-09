import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  userId: string;
  onSuccess: () => void | Promise<void>;
  onCancel?: () => void;
}

const MfaChallenge = ({ userId, onSuccess, onCancel }: Props) => {
  const queryClient = useQueryClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        const verified = data.totp.find((f) => f.status === "verified") ?? data.totp[0];
        if (!verified) throw new Error("No verified authenticator found");
        setFactorId(verified.id);
        const { data: challengeData, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: verified.id });
        if (challengeError) throw challengeError;
        setChallengeId(challengeData.id);
      } catch (err: any) {
        toast.error(err?.message || "Could not start MFA challenge");
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["mfa-satisfied", userId] });
      await onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Invalid code. Please try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = async () => {
    if (onCancel) {
      onCancel();
    } else {
      await supabase.auth.signOut();
    }
    setCode("");
    setFactorId(null);
    setChallengeId(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">Enter your verification code</h2>
        <p className="text-sm text-muted-foreground">
          Open your authenticator app and enter the 6-digit code.
        </p>
      </div>
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">6-digit code</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            autoFocus
            required
            disabled={initializing}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={initializing || verifying || code.length !== 6}
        >
          {verifying ? "Verifying..." : "Verify"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={handleCancel}>
          Cancel and sign out
        </Button>
      </form>
    </div>
  );
};

export default MfaChallenge;
