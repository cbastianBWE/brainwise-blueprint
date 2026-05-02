import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Info, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CERT_LABELS: Record<string, string> = {
  ptp_coach: 'PTP Certified Coach',
  ai_transformation_coach: 'AI Transformation Certified Coach',
  ai_transformation_ptp_coach: 'AI Transformation + PTP Certified Coach',
  my_brainwise_coach: 'My BrainWise Coach',
};

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const [coachToken, setCoachToken] = useState<string | null>(null);
  const [coachInvitation, setCoachInvitation] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    certification_type: string;
  } | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    // Pre-fill email from ?email= query param (client invitation flow)
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    // Stash corporate invite code for the onboarding flow
    const inviteParam = searchParams.get('invite');
    if (inviteParam && inviteParam.trim()) {
      sessionStorage.setItem('pending_invite_code', inviteParam.trim().toUpperCase());
    }

    const token = searchParams.get('coach_token');
    if (!token) return;
    setCoachToken(token);
    setTokenLoading(true);
    (async () => {
      const { data } = await supabase.functions.invoke('validate-coach-invite', {
        body: { token }
      });
      if (data) {
        setCoachInvitation(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setEmail(data.email);
      }
      setTokenLoading(false);
    })();
  }, [searchParams]);

  const validatePassword = (pw: string) => ({
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  });
  const isPasswordValid = (pw: string) => Object.values(validatePassword(pw)).every(Boolean);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Error", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!isPasswordValid(password)) {
      toast({ title: "Error", description: "Password must be at least 8 characters with one capital letter, one number, and one symbol.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Error", description: "You must agree to the Terms of Service and Privacy Policy.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: `${firstName.trim()} ${lastName.trim()}` },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      if (coachToken && coachInvitation) {
        await supabase.functions.invoke('accept-coach-invitation', {
          body: { token: coachToken },
        });
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to <strong>{email}</strong>. Please check your email to verify your account before logging in.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/login">
              <Button variant="outline">Back to Log In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>Join BrainWise to get started</CardDescription>
        </CardHeader>
        <CardContent>
          {coachInvitation && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 mb-4">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                You have been invited to join BrainWise as a{' '}
                <strong>{CERT_LABELS[coachInvitation.certification_type] || coachInvitation.certification_type}</strong>.
                Your details have been pre-filled.
              </p>
            </div>
          )}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  readOnly={!!coachInvitation}
                  className={coachInvitation ? "bg-muted" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  readOnly={!!coachInvitation}
                  className={coachInvitation ? "bg-muted" : ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={!!coachInvitation}
                className={coachInvitation ? "bg-muted" : ""}
              />
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
              {password.length > 0 && (() => {
                const checks = validatePassword(password);
                return (
                  <div className="space-y-1 mt-2">
                    {[
                      { key: 'length', label: 'At least 8 characters' },
                      { key: 'uppercase', label: 'At least one capital letter' },
                      { key: 'number', label: 'At least one number' },
                      { key: 'symbol', label: 'At least one symbol' },
                    ].map(({ key, label }) => (
                      <div key={key} className={`flex items-center gap-1.5 text-xs ${checks[key as keyof typeof checks] ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${checks[key as keyof typeof checks] ? 'bg-green-600' : 'bg-muted-foreground/40'}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onMouseDown={() => setShowConfirm(true)}
                  onMouseUp={() => setShowConfirm(false)}
                  onMouseLeave={() => setShowConfirm(false)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs flex items-center gap-1.5 mt-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${password === confirmPassword ? 'bg-green-600' : 'bg-red-500'}`} />
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c === true)} />
              <Label htmlFor="terms" className="text-sm leading-snug">
                I agree to the{" "}
                <a href="/terms" className="text-primary underline">Terms of Service</a> and{" "}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a>
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;
