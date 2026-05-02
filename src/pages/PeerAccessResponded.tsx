import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type Result = "accepted" | "declined" | "expired" | "already-responded" | "invalid" | "error";

const MESSAGES: Record<Result, { title: string; body: string; icon: JSX.Element; iconColor: string }> = {
  accepted: {
    title: "Access granted",
    body: "You've accepted the request. The requester can now view your PTP results. You can revoke this access anytime from Privacy Settings.",
    icon: <CheckCircle2 className="h-12 w-12" />,
    iconColor: "text-[var(--bw-forest)]",
  },
  declined: {
    title: "Request declined",
    body: "You've declined the request. The requester will not be notified.",
    icon: <XCircle className="h-12 w-12" />,
    iconColor: "text-muted-foreground",
  },
  expired: {
    title: "Request expired",
    body: "This access request expired before you responded. No action has been taken.",
    icon: <Clock className="h-12 w-12" />,
    iconColor: "text-muted-foreground",
  },
  "already-responded": {
    title: "Already responded",
    body: "You've already responded to this request. Open BrainWise to see its current status.",
    icon: <AlertCircle className="h-12 w-12" />,
    iconColor: "text-muted-foreground",
  },
  invalid: {
    title: "Link invalid",
    body: "This link is invalid or has already been used. If you meant to respond to a request, open BrainWise and check your inbox.",
    icon: <AlertCircle className="h-12 w-12" />,
    iconColor: "text-muted-foreground",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't process your response. Please open BrainWise and try from the inbox.",
    icon: <AlertCircle className="h-12 w-12" />,
    iconColor: "text-destructive",
  },
};

export default function PeerAccessResponded() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<Result>("invalid");

  useEffect(() => {
    const r = params.get("result") as Result | null;
    if (r && r in MESSAGES) {
      setResult(r);
    } else {
      setResult("invalid");
    }
  }, [params]);

  const msg = MESSAGES[result];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 flex flex-col items-center text-center space-y-4">
          <div className={msg.iconColor}>{msg.icon}</div>
          <h1 className="text-2xl font-semibold">{msg.title}</h1>
          <p className="text-muted-foreground">{msg.body}</p>
          <div className="pt-2 w-full flex justify-center">
            <Button onClick={() => navigate("/settings/sharing-requests")} className="w-full sm:w-auto">
              Open BrainWise
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
