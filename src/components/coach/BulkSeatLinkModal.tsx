import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ASSESSMENT_PURCHASE } from "@/lib/stripe";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

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
  onComplete: () => void;
}

type Stage = "form" | "submitting";

export default function BulkSeatLinkModal({
  open, onOpenChange, allowedInstrumentIds, perAssessmentPrice,
}: Props) {
  const [stage, setStage] = useState<Stage>("form");
  const [instrumentShortId, setInstrumentShortId] = useState<string>("");
  const [seats, setSeats] = useState<string>("5");
  const [coachNote, setCoachNote] = useState<string>("");

  const allowedInstruments = INSTRUMENTS.filter(i => allowedInstrumentIds.has(i.id));

  const resetAll = () => {
    setStage("form");
    setInstrumentShortId("");
    setSeats("5");
    setCoachNote("");
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

    const { data, error } = await supabase.rpc("coach_bulk_link_create" as any, {
      p_instrument_id: uuid,
      p_seats: seatsNum,
      p_coach_note: coachNote.trim() || null,
    } as any);
    if (error) {
      toast.error("Could not create link: " + error.message);
      setStage("form");
      return;
    }
    const linkId = (data as any[])?.[0]?.link_id;
    if (!linkId) {
      toast.error("Link created but its id was missing in the response.");
      setStage("form");
      return;
    }

    const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout", {
      body: { mode: "coach_bulk_link", price_id: ASSESSMENT_PURCHASE.price_id, bulk_link_id: linkId },
    });
    if (checkoutErr || !checkoutData?.url) {
      toast.error("Link created but checkout could not start. It is saved as unpaid — contact support.");
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
              <RadioGroup value={instrumentShortId} onValueChange={setInstrumentShortId}>
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
              onChange={(e) => setSeats(e.target.value)}
            />
            {!validSeats && seats !== "" && (
              <p className="text-xs text-destructive">Enter a number between 1 and 500.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coach-note">Personal Note (optional)</Label>
            <Textarea id="coach-note" value={coachNote} onChange={(e) => setCoachNote(e.target.value)} rows={2} />
          </div>

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
              ) : "Continue to Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
