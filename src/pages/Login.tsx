import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRoleRedirect } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { redirectByRole } = useRoleRedirect();
  const [showReactivate, setShowReactivate] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('banned') || error.message.toLowerCase().includes('user is banned')) {
        setShowReactivate(true);
      } else {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      }
    } else if (data.user) {
      await redirectByRole(data.user.id);
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
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Log in to your BrainWise account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
        </CardContent>
      </Card>
      <AlertDialog open={showReactivate} onOpenChange={setShowReactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Scheduled for Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Your account was scheduled for deletion but is still within the 90-day recovery period. Would you like to reactivate your account and restore full access?
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
