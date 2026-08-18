import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PtpWalkthroughPanel from "./PtpWalkthroughPanel";
import { readWalkthroughError, type WalkthroughOffer } from "./ptpWalkthroughShared";

/**
 * Permanent walkthrough entry point on the report itself. This is the one that
 * reaches everybody who already has a report; the intro gate only reaches
 * brand-new users.
 */
export default function PtpWalkthroughEntry({
  assessmentResultId,
}: {
  assessmentResultId: string;
}) {
  const [offer, setOffer] = useState<WalkthroughOffer | null>(null);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState<string | undefined>(undefined);

  console.info("[ptp-walkthrough] entry mounted", assessmentResultId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("ptp-walkthrough", {
        body: { action: "offer", assessment_result_id: assessmentResultId },
      });
      const err = readWalkthroughError(error, data);
      if (cancelled) return;
      if (err) {
        console.error("[ptp-walkthrough] offer failed", {
          assessmentResultId,
          code: err.code,
          status: err.status,
          message: err.message,
        });
        setHidden(true);
        return;
      }
      const o = data as WalkthroughOffer;
      setOffer(o);
      console.info("[ptp-walkthrough] offer ok", {
        assessmentResultId,
        offer: o.offer,
        resume: o.resume_session_id,
        freeUsed: o.free_walkthrough_used,
        steps: o.steps?.length ?? 0,
      });
      setResumeId(o.resume_session_id ?? undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentResultId]);

  if (hidden || !offer) return null;

  const canResume = Boolean(offer.resume_session_id);
  const available = canResume || offer.offer;
  if (!available) {
    console.warn("[ptp-walkthrough] offer declined by server", {
      assessmentResultId,
      offer: offer.offer,
      resume: offer.resume_session_id,
    });
    return null;
  }

  const title = canResume
    ? "Continue your guided walkthrough"
    : "Take a guided walkthrough of this report";
  const body = canResume
    ? "Pick up where you left off. It's optional, and you can stop at any point."
    : "An optional, guided read of your report. It takes about twenty minutes and you can stop at any point.";

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setResumeId(offer.resume_session_id ?? undefined);
              setOpen(true);
            }}
          >
            {canResume ? "Continue" : "Start walkthrough"}
          </Button>
        </CardContent>
      </Card>
      {open && (
        <PtpWalkthroughPanel
          key={resumeId ?? "new"}
          assessmentResultId={assessmentResultId}
          sessionId={resumeId}
          steps={offer.steps}
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setResumeId(undefined);
          }}
        />
      )}
    </>
  );
}
