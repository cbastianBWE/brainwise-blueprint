import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type OrderRow = {
  status: string;
  generated_profile_id: string | null;
  order_type: "team" | "paired";
};

export default function ReportPaymentConfirmed() {
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const cancelled = params.get("status") === "cancelled";

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (cancelled || !orderId) return;
    let cancel = false;
    let n = 0;

    const poll = async () => {
      if (cancel) return;
      const { data, error } = await supabase
        .from("report_orders")
        .select("status, generated_profile_id, order_type")
        .eq("id", orderId)
        .single();
      if (cancel) return;
      if (error && !data) {
        if (n === 0) setNotFound(true);
        return;
      }
      setOrder(data as OrderRow);
      if (data?.status === "generated" && data.generated_profile_id) return;
      n += 1;
      setAttempts(n);
      if (n >= 30) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancel = true;
    };
  }, [orderId, cancelled]);

  if (cancelled) {
    return (
      <div className="container max-w-xl py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              Payment wasn't completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your report is still waiting. Ask your coach to resend the payment link when you're ready.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderId || notFound) {
    return (
      <div className="container max-w-xl py-16">
        <Card>
          <CardHeader>
            <CardTitle>Order not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We couldn't find that order. If you were charged, contact your coach.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ready = order?.status === "generated" && order.generated_profile_id;
  const href = ready
    ? order!.order_type === "team"
      ? `/team-report/${order!.generated_profile_id}`
      : `/paired-report/${order!.generated_profile_id}`
    : null;

  return (
    <div className="container max-w-xl py-16">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Payment received. Thank you.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ready ? (
            <>
              <p className="text-sm text-muted-foreground">Your report is ready.</p>
              <Button asChild>
                <Link to={href!}>View your report</Link>
              </Button>
            </>
          ) : timedOut ? (
            <p className="text-sm text-muted-foreground">
              Your payment went through and your report is being prepared. It will appear in your account shortly.
            </p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Your report is being prepared... ({attempts}/30)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
