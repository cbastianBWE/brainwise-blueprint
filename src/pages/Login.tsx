import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRoleRedirect } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import MfaChallenge from "@/components/MfaChallenge";
import { getTrustedDeviceToken, clearTrustedDeviceToken } from "@/lib/trustedDevice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { redirectByRole } = useRoleRedirect();
  const [showReactivate, setShowReactivate] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnconfirmedEmail(null);
    setResent(false);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      const code = (error as { code?: string }).code ?? '';
      const msg = error.message.toLowerCase();
      if (code === 'user_banned' || msg.includes('banned')) {
        setShowReactivate(true);
      } else if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
        setUnconfirmedEmail(email.trim());
      } else if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
        toast({
          title: "Email or password is incorrect",
          description: "Double-check both and try again. If you've forgotten your password, use the reset link below.",
          variant: "destructive",
        });
      } else if (code === 'over_request_rate_limit' || msg.includes('rate limit')) {
        toast({
          title: "Too many attempts",
          description: "Please wait a minute before trying again.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      }
      return;
    }

    if (data.user) {
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasVerified = (factorsData?.totp ?? []).some((f) => f.status === "verified");
        if (hasVerified) {
          try {
            const token = getTrustedDeviceToken();
            if (token) {
              const { data: trusted } = await supabase.rpc("check_trusted_device" as any, { p_token: token });
              if (trusted === true) {
                setLoading(false);
                await redirectByRole(data.user.id);
                return;
              } else {
                clearTrustedDeviceToken();
              }
            }
          } catch {
            // fall through to challenge
          }
          setMfaUserId(data.user.id);
          setLoading(false);
          return;
        }
      } catch {
        // fall through to redirect
      }
      setLoading(false);
      await redirectByRole(data.user.id);
    } else {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const { error } = await supabase.functions.invoke('reactivate-account', {
        body: { email: email.trim() },
      });
      if (error) throw error;
      setShowReactivate(false);
      toast({ title: 'Account Reactivated', description: 'Your account has been restored. Please log in.' });
    } catch {
      toast({ title: 'Reactivation Failed', description: 'Please contact support.', variant: 'destructive' });
    } finally {
      setReactivating(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (error) {
      const code = (error as { code?: string }).code ?? '';
      if (code === 'over_email_send_rate_limit' || error.message.toLowerCase().includes('rate limit')) {
        toast({
          title: "Please wait before requesting another",
          description: "A verification email was sent recently. Check your inbox and spam folder, then try again in a few minutes.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Could not resend", description: error.message, variant: "destructive" });
      }
      return;
    }
    setResent(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-6">
      <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img src="/brain-icon.png" alt="BrainWise" className="h-8 w-8" />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18, color: "var(--bw-navy)" }}>
          BrainWise Enterprises
        </span>
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {mfaUserId ? "Two-Factor Verification" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {mfaUserId ? "One more step to sign in" : "Log in to your BrainWise account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mfaUserId ? (
            <MfaChallenge
              userId={mfaUserId}
              onSuccess={async () => {
                await redirectByRole(mfaUserId);
              }}
            />
          ) : (
            <>
              {unconfirmedEmail && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 mb-4 space-y-3">
                  <p className="text-sm text-foreground">
                    <strong>Verify your email to continue.</strong> We sent a verification
                    link to {unconfirmedEmail}. You'll need to click it before you can log
                    in. Check your spam folder if it isn't in your inbox.
                  </p>
                  {resent ? (
                    <p className="text-sm text-[var(--bw-forest)]">
                      A new verification link is on its way. Please open it soon, links
                      expire after a short window.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmation}
                      disabled={resending}
                    >
                      {resending ? "Sending..." : "Resend verification email"}
                    </Button>
                  )}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setUnconfirmedEmail(null); setResent(false); }} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setUnconfirmedEmail(null); setResent(false); }}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onMouseDown={() => setShowPassword(true)}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Log In"}
                </Button>
              </form>
              <div className="text-center mt-4 space-y-2">
                <Link to="/forgot-password" className="text-sm text-primary underline block">
                  Forgot your password?
                </Link>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary underline">Sign up</Link>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={showReactivate} onOpenChange={setShowReactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Scheduled for Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Your account was scheduled for deletion but is still within the 90-day recovery period. You can restore your account and all your previous assessment data. Note: any previous subscription has been cancelled and will need to be reactivated separately if desired.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={reactivating}>
              {reactivating ? 'Reactivating...' : 'Reactivate My Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Login;
