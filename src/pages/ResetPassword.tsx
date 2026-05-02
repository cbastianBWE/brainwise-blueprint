import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const validatePassword = (pw: string) => ({
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  });
  const isPasswordValid = (pw: string) => Object.values(validatePassword(pw)).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid(password)) {
      toast({ title: "Error", description: "Password must be at least 8 characters with one capital letter, one number, and one symbol.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password Updated", description: "Your password has been reset. You can now log in." });
      navigate("/login");
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
            <CardTitle className="text-2xl">Invalid Link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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
                      <div key={key} className={`flex items-center gap-1.5 text-xs ${checks[key as keyof typeof checks] ? 'text-[var(--bw-forest)]' : 'text-muted-foreground'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${checks[key as keyof typeof checks] ? 'bg-[var(--bw-forest)]' : 'bg-muted-foreground/40'}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                <p className={`text-xs flex items-center gap-1.5 mt-1 ${password === confirmPassword ? 'text-[var(--bw-forest)]' : 'text-destructive'}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${password === confirmPassword ? 'bg-[var(--bw-forest)]' : 'bg-destructive'}`} />
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
