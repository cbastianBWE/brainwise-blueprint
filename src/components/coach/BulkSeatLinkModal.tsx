import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import WalkthroughChoice from "@/components/coach/WalkthroughChoice";

const INSTRUMENTS = [
  { id: "PTP",   uuid: "02618e9a-d411-44cf-b316-fe368edeac03", name: "Personal Threat Profile" },
  { id: "NAI",   uuid: "77d1290f-1daf-44e0-931f-b9b8ad185520", name: "Neuroscience Adoption Index" },
  { id: "AIRSA", uuid: "abb62120-8cc8-435f-babc-dd6a27fbc235", name: "AI Readiness Skills Assessment" },
  { id: "HSS",   uuid: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0", name: "Habit Stabilization Scorecard" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedInstrumentIds: Set<string>;
  perAssessmentPrice: number | null;
  coachWalkthroughDefault: boolean | null;
  onComplete: () => void;
}


type Stage = "form" | "submitting";

async function readFnError(err: unknown): Promise<{ code: string | null; status: number | null }> {
  const ctx = (err as { context?: Response } | null)?.context;
  if (!ctx || typeof ctx.json !== "function") return { code: null, status: null };
  try {
    const body = await ctx.json();
    return { code: typeof body?.error === "string" ? body.error : null, status: ctx.status ?? null };
  } catch {
    return { code: null, status: ctx.status ?? null };
  }
}

export default function BulkSeatLinkModal({
  open, onOpenChange, allowedInstrumentIds, perAssessmentPrice, coachWalkthroughDefault, onComplete,
}: Props) {
  const [stage, setStage] = useState<Stage>("form");
  const [instrumentShortId, setInstrumentShortId] = useState<string>("");
  const [seats, setSeats] = useState<string>("5");
  const [coachNote, setCoachNote] = useState<string>("");
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);
  const [preferredContext, setPreferredContext] = useState<'professional' | 'personal' | 'both' | null>(null);
  const [resultsReleased, setResultsReleased] = useState(false);
  const [walkthroughChoice, setWalkthroughChoice] = useState<"default" | "on" | "off">("default");

  const walkthroughValue = (): boolean | null =>
    walkthroughChoice === "default" ? null : walkthroughChoice === "on";

  const allowedInstruments = INSTRUMENTS.filter(i => allowedInstrumentIds.has(i.id));

  const resetAll = () => {
    setStage("form");
    setInstrumentShortId("");
    setSeats("5");
    setCoachNote("");
    setPendingLinkId(null);
    setPreferredContext(null);
    setResultsReleased(false);
    setWalkthroughChoice("default");
  };


  const handleOpenChange = (o: boolean) => {
    if (!o) resetAll();
    onOpenChange(o);
  };

  const seatsNum = parseInt(seats, 10);
  const validSeats = Number.isFinite(seatsNum) && seatsNum >= 1 && seatsNum <= 500;
  const validInstrument = !!instrumentShortId && allowedInstrumentIds.has(instrumentShortId);
  const priceMissing = perAssessmentPrice === null;
  const submitDisabled = !validInstrument || !validSeats || priceMissing || stage === "submitting";

  const total = perAssessmentPrice !== null && validSeats
    ? (seatsNum * perAssessmentPrice).toFixed(2)
    : null;

  const handleSubmit = async () => {
    const uuid = INSTRUMENTS.find(i => i.id === instrumentShortId)?.uuid;
    if (!uuid) return;
    setStage("submitting");

    let linkId = pendingLinkId;

    if (!linkId) {
      const { data, error } = await supabase.rpc("coach_bulk_link_create" as any, {
        p_instrument_id: uuid,
        p_seats: seatsNum,
        p_coach_note: coachNote.trim() || null,
        p_preferred_first_context: preferredContext,
        p_results_released: resultsReleased,
        p_walkthrough_enabled: walkthroughValue(),

      } as any);
      if (error) {
        toast.error("Could not create link: " + error.message);
        setStage("form");
        return;
      }
      linkId = (data as any[])?.[0]?.link_id;
      if (!linkId) {
        toast.error("Link created but its id was missing in the response.");
        setStage("form");
        return;
      }
      setPendingLinkId(linkId);
    }

    const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout", {
      body: { mode: "coach_bulk_link", bulk_link_id: linkId },
    });

    if (checkoutErr || !checkoutData?.url) {
      const { code } = await readFnError(checkoutErr);

      if (code === "bulk_link_not_payable") {
        toast.success("This seat link is already paid and active. Find it in the Active Seat Links list.");
        resetAll();
        onOpenChange(false);
        return;
      }

      let message: string;
      switch (code) {
        case "missing_bearer_token":
        case "not_authenticated":
          message = "Your session has expired. Sign in again and retry.";
          break;
        case "not_your_bulk_link":
          message = "This seat link belongs to another practitioner.";
          break;
        case "bulk_link_not_found":
          message = "That seat link no longer exists. Close and start again.";
          break;
        case "bulk_link_seats_invalid":
          message = "The seat count on this link is invalid. Close and start again.";
          break;
        case "pricing_not_configured":
          message = "Seat pricing is not configured. Contact support.";
          break;
        case "origin_not_allowed":
          message = "Checkout could not start from this address. Contact support.";
          break;
        default:
          message = "Checkout could not start. Your link is saved as unpaid and you can retry.";
      }

      if (code === "bulk_link_not_found" || code === "bulk_link_seats_invalid") {
        setPendingLinkId(null);
      }

      toast.error(message);
      setStage("form");
      return;
    }
    window.location.href = checkoutData.url;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Prepaid Seat Link</DialogTitle>
          <DialogDescription>
            Pay for a set number of assessment seats up front, then share one link.
            Each person who signs up through it uses one seat until they're gone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Assessment (one per link)</Label>
            {allowedInstruments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No certified instruments available.</p>
            ) : (
              <RadioGroup value={instrumentShortId} onValueChange={(v) => { setPendingLinkId(null); setInstrumentShortId(v); }}>
                {allowedInstruments.map(inst => (
                  <div key={inst.id} className="flex items-center gap-2">
                    <RadioGroupItem value={inst.id} id={`seatlink-${inst.id}`} />
                    <Label htmlFor={`seatlink-${inst.id}`} className="font-normal cursor-pointer">
                      <span className="font-medium">{inst.id}</span>{" "}
                      <span className="text-muted-foreground">{inst.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="seat-count">Number of seats</Label>
            <Input
              id="seat-count"
              type="number"
              min={1}
              max={500}
              value={seats}
              onChange={(e) => { setPendingLinkId(null); setSeats(e.target.value); }}
            />
            {!validSeats && seats !== "" && (
              <p className="text-xs text-destructive">Enter a number between 1 and 500.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coach-note">Personal Note (optional)</Label>
            <Textarea id="coach-note" value={coachNote} onChange={(e) => setCoachNote(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5 pr-3">
              <Label className="text-sm">Allow client to see results immediately</Label>
              <p className="text-xs text-muted-foreground">If off, client must wait for practitioner debrief before viewing results</p>
            </div>
            <Switch checked={resultsReleased} onCheckedChange={setResultsReleased} />
          </div>

          {instrumentShortId === "PTP" && (
            <div className="space-y-2 pt-2">
              <Label className="text-sm">Suggest a starting context (optional)</Label>
              <p className="text-xs text-muted-foreground">
                The PTP has a work half and a personal half. Your suggestion pre-selects
                the client's choice and explains that it came from you. They can still
                pick either, or both.
              </p>
              <div className="flex flex-wrap gap-2">
                {([
                  { v: null, label: "No suggestion" },
                  { v: 'professional', label: "Corporate / Professional" },
                  { v: 'personal', label: "Personal / Social" },
                  { v: 'both', label: "Both" },
                ] as const).map((opt) => (
                  <Button
                    key={opt.label}
                    type="button"
                    size="sm"
                    variant={preferredContext === opt.v ? "default" : "outline"}
                    onClick={() => setPreferredContext(opt.v)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <WalkthroughChoice
            value={walkthroughChoice}
            onChange={(v) => { setPendingLinkId(null); setWalkthroughChoice(v); }}
            coachDefault={coachWalkthroughDefault}
          />



          <div className="rounded-md bg-muted/50 p-3 text-sm">
            {priceMissing ? (
              <span className="text-muted-foreground">Loading price…</span>
            ) : (
              <>
                Total due now: <strong>{total !== null ? `$${total}` : "—"}</strong>{" "}
                <span className="text-muted-foreground">
                  ({validSeats ? seatsNum : 0} × ${perAssessmentPrice?.toFixed(2)})
                </span>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            You pay for all seats now. Seats are not refunded automatically if
            unused. After payment, copy your link from the Active Seat Links list.
          </p>

          <div className="flex justify-end pt-1">
            <Button onClick={handleSubmit} disabled={submitDisabled}>
              {stage === "submitting" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting…</>
              ) : pendingLinkId ? "Retry Payment" : "Continue to Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
