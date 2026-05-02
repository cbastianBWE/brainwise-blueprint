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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes('banned') || error.message.toLowerCase().includes('user is banned')) {
        setShowReactivate(true);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Brain className="mx-auto h-10 w-10 text-primary mb-2" />
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
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
