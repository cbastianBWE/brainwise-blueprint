import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("bw_coach_winback_unsubscribe", {
        p_token: token,
      });
      if (error || data !== true) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Email preferences</h1>
        {status === "loading" && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {status === "success" && (
          <p className="text-muted-foreground">
            You've been unsubscribed from practitioner subscription reminders.
          </p>
        )}
        {status === "error" && (
          <p className="text-muted-foreground">
            This link is invalid or has expired.
          </p>
        )}
      </div>
    </div>
  );
}
