import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BadgeCheck, Loader2, XCircle } from "lucide-react";

interface PublicCred {
  valid: boolean;
  display_name?: string;
  recipient_name?: string | null;
  certification_type?: string;
  certified_at?: string | null;
}

export default function VerifyCertification() {
  const { certId } = useParams<{ certId: string }>();
  const [cred, setCred] = useState<PublicCred | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc(
        "get_public_certification" as never,
        { p_certification_id: certId } as never,
      );
      if (cancelled) return;
      setCred((data as PublicCred) ?? { valid: false });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [certId]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm text-center space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cred?.valid ? (
          <>
            <div className="flex justify-center">
              <BadgeCheck className="h-14 w-14 text-[var(--bw-orange)]" />
            </div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--bw-orange)] font-semibold">
              Verified credential
            </div>
            <h1 className="text-2xl font-semibold text-[var(--bw-navy)]">
              {cred.display_name}
            </h1>
            {cred.recipient_name && (
              <p className="text-sm text-muted-foreground">
                Awarded to {cred.recipient_name}
                {cred.certified_at
                  ? ` on ${format(new Date(cred.certified_at), "MMMM d, yyyy")}`
                  : ""}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Issued by BrainWise Enterprises
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <XCircle className="h-14 w-14 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">Credential not found</h1>
            <p className="text-sm text-muted-foreground">
              This certification link is invalid, or the certification is no longer active.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
