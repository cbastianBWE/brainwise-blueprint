import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FailureCode = "already_used" | "invalid_token" | "too_many_attempts" | "generic";

const Activate = () => {
  const { token } = useParams<{ token: string }>();
  const [failure, setFailure] = useState<FailureCode | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setFailure("invalid_token");
        return;
      }

      const { data, error } = await supabase.functions.invoke("activate-account", {
        body: { action: "mint", token },
      });

      if (cancelled) return;

      if (error) {
        let detail: any = null;
        try {
          detail = await (error as any).context?.json?.();
        } catch {
          detail = null;
        }
        const code = detail?.error ?? detail?.code ?? detail?.reason;
        if (code === "already_used" || code === "invalid_token" || code === "too_many_attempts") {
          setFailure(code);
        } else {
          setFailure("generic");
        }
        return;
      }

      if (!data?.action_link) {
        setFailure("generic");
        return;
      }

      sessionStorage.setItem("bw_activation_token", token);
      window.location.href = data.action_link;
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!failure) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
            <CardTitle className="text-2xl">Opening your account setup...</CardTitle>
            <CardDescription>Just a moment.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const copy: Record<FailureCode, { title: string; description: string }> = {
    already_used: {
      title: "Already Activated",
      description: "You've already set your password.",
    },
    invalid_token: {
      title: "Invalid Link",
      description: "This activation link isn't valid.",
    },
    too_many_attempts: {
      title: "Too Many Attempts",
      description: "Too many attempts. Please contact support@brainwiseenterprises.com.",
    },
    generic: {
      title: "Something Went Wrong",
      description: "We couldn't open your account setup. Please request a new sign-in link.",
    },
  };

  const { title, description } = copy[failure];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          {failure === "already_used" && (
            <>
              <Link to="/login">
                <Button className="w-full">Log In</Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                <Link to="/forgot-password" className="text-primary underline">
                  Forgot your password?
                </Link>
              </p>
            </>
          )}
          {(failure === "invalid_token" || failure === "generic") && (
            <p className="text-sm text-muted-foreground">
              <Link to="/forgot-password" className="text-primary underline">
                Request a sign-in link
              </Link>
            </p>
          )}
          {failure === "too_many_attempts" && (
            <p className="text-sm text-muted-foreground">
              <a href="mailto:support@brainwiseenterprises.com" className="text-primary underline">
                support@brainwiseenterprises.com
              </a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Activate;
