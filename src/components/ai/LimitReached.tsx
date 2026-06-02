import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  limit: number;
  tier: string;
  creditBalance?: number;
  subscriptionActive?: boolean;
  premiumLimit?: number;
}

export default function LimitReached({
  limit,
  tier,
  creditBalance = 0,
  subscriptionActive = true,
  premiumLimit = 400,
}: Props) {
  const navigate = useNavigate();

  if (!subscriptionActive) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center text-center py-8 space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              You're out of AI chat messages
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Subscribe to Premium for {premiumLimit} AI coaching messages every month.
            </p>
          </div>
          <Button onClick={() => navigate("/pricing")} className="gap-2">
            Upgrade to Premium
          </Button>
          <button
            onClick={() => navigate("/settings")}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Questions? Contact Support
          </button>
        </CardContent>
      </Card>
    );
  }

  // First day of next month
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetStr = resetDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col items-center text-center py-8 space-y-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Monthly Message Limit Reached
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            You have used all {limit} of your monthly AI chat messages. Your
            limit resets on {resetStr}.
          </p>
        </div>
        {tier === "base" && (
          <Button onClick={() => navigate("/pricing")} className="gap-2">
            Upgrade to Premium for {premiumLimit} Messages/Month
          </Button>
        )}
        <button
          onClick={() => navigate("/settings")}
          className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
        >
          Questions? Contact Support
        </button>
      </CardContent>
    </Card>
  );
}
