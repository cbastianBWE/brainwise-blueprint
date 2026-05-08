import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Copy, Link as LinkIcon } from "lucide-react";

const INSTRUMENTS = [
  { id: "PTP",   uuid: "02618e9a-d411-44cf-b316-fe368edeac03", name: "Personal Threat Profile" },
  { id: "NAI",   uuid: "77d1290f-1daf-44e0-931f-b9b8ad185520", name: "Neuroscience Adoption Index" },
  { id: "AIRSA", uuid: "abb62120-8cc8-435f-babc-dd6a27fbc235", name: "AI Readiness Skills Assessment" },
  { id: "HSS",   uuid: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0", name: "Habit Stabilization Scorecard" },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedInstrumentIds: Set<string>;
  perAssessmentPrice: number | null;
  onComplete: () => void;
}

type Stage = "form" | "submitting" | "result";

export default function ShareableLinkModal({
  open, onOpenChange, allowedInstrumentIds, perAssessmentPrice, onComplete,
}: Props) {
  const [stage, setStage] = useState<Stage>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedInstrumentShortIds, setSelectedInstrumentShortIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<"self_pay" | "coach_paid">("self_pay");
  const [coachNote, setCoachNote] = useState("");
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [resultExpiresAt, setResultExpiresAt] = useState<string | null>(null);

  const allowedInstruments = INSTRUMENTS.filter(i => allowedInstrumentIds.has(i.id));

  const resetAll = () => {
    setStage("form");
    setFirstName(""); setLastName(""); setEmail("");
    setSelectedInstrumentShortIds([]);
    setPaymentMode("self_pay");
    setCoachNote("");
    setResultLink(null);
    setResultExpiresAt(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetAll();
    onOpenChange(o);
  };

  const toggleInstrument = (id: string) => {
    setSelectedInstrumentShortIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const validEmail = EMAIL_RE.test(email.trim());
  const validInstruments = selectedInstrumentShortIds.length > 0
    && selectedInstrumentShortIds.every(id => allowedInstrumentIds.has(id));
  const coachPaidPriceMissing = paymentMode === "coach_paid" && perAssessmentPrice === null;
  const submitDisabled = !validEmail || !validInstruments || coachPaidPriceMissing || stage === "submitting";

  const handleSubmit = async () => {
    const instrumentUuids = selectedInstrumentShortIds
      .map(id => INSTRUMENTS.find(i => i.id === id)?.uuid)
      .filter(Boolean) as string[];

    setStage("submitting");

    if (paymentMode === "self_pay") {
      const params = {
        p_client_email: email.trim().toLowerCase(),
        p_client_first_name: firstName.trim() || null,
        p_client_last_name: lastName.trim() || null,
        p_instrument_ids: instrumentUuids,
        p_coach_note: coachNote.trim() || null,
      };
      console.log("[ShareableLinkModal] coach_shareable_link_self_pay params:", params);
      const { data, error } = await supabase.rpc("coach_shareable_link_self_pay" as any, params as any);
      console.log("[ShareableLinkModal] coach_shareable_link_self_pay response:", { data, error });
      if (error) {
        toast.error("Failed to generate link: " + error.message);
        setStage("form");
        return;
      }
      const arr = (data as any[]) || [];
      const expiresAt = arr[0]?.expires_at ?? null;
      const url = `${window.location.origin}/signup?email=${encodeURIComponent(email.trim().toLowerCase())}`;
      setResultLink(url);
      setResultExpiresAt(expiresAt);
      setStage("result");
      return;
    }

    // coach_paid
    const params = {
      p_client_email: email.trim().toLowerCase(),
      p_client_first_name: firstName.trim() || null,
      p_client_last_name: lastName.trim() || null,
      p_instrument_ids: instrumentUuids,
      p_coach_note: coachNote.trim() || null,
    };
    console.log("[ShareableLinkModal] coach_shareable_link_coach_paid params:", params);
    const { data: rpcData, error: rpcError } = await supabase.rpc("coach_shareable_link_coach_paid" as any, params as any);
    console.log("[ShareableLinkModal] coach_shareable_link_coach_paid response:", { rpcData, rpcError });
    if (rpcError) {
      toast.error("Failed to create batch: " + rpcError.message);
      setStage("form");
      return;
    }
    const batchId = (rpcData as any[])?.[0]?.batch_id;
    if (!batchId) {
      toast.error("Batch created but batch_id missing in response.");
      setStage("form");
      return;
    }
    const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout", {
      body: { mode: "coach_bulk_order", batch_id: batchId },
    });
    console.log("[ShareableLinkModal] create-checkout response:", { checkoutData, checkoutErr });
    if (checkoutErr || !checkoutData?.url) {
      toast.error("Batch created but checkout redirect failed. Contact support.");
      setStage("form");
      return;
    }
    window.location.href = checkoutData.url;
  };

  const copyLink = () => {
    if (!resultLink) return;
    navigator.clipboard.writeText(resultLink);
    toast.success("Link copied to clipboard");
  };

  const total = perAssessmentPrice !== null
    ? (selectedInstrumentShortIds.length * perAssessmentPrice).toFixed(2)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Shareable Link</DialogTitle>
          <DialogDescription>
            Create a signup link you can share with your client by email, text, or QR code.
          </DialogDescription>
        </DialogHeader>

        {stage === "form" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">First Name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Client Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Assessment Instruments</Label>
              <div className="space-y-2 rounded-md border p-3">
                {allowedInstruments.length === 0 && (
                  <p className="text-xs text-muted-foreground">No certified instruments available.</p>
                )}
                {allowedInstruments.map(inst => (
                  <label key={inst.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedInstrumentShortIds.includes(inst.id)}
                      onCheckedChange={() => toggleInstrument(inst.id)}
                    />
                    <span className="text-sm font-medium">{inst.id}</span>
                    <span className="text-xs text-muted-foreground">{inst.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Payment</Label>
              <RadioGroup
                value={paymentMode}
                onValueChange={(v) => setPaymentMode(v as "self_pay" | "coach_paid")}
                className="space-y-1"
              >
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="self_pay" /> Client pays themselves
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="coach_paid" /> I'll pay for my client
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Personal Note <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea value={coachNote} onChange={e => setCoachNote(e.target.value)} rows={2} />
            </div>

            {paymentMode === "coach_paid" && selectedInstrumentShortIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: {total !== null ? `$${total}` : "loading…"}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSubmit} disabled={submitDisabled}>
                {paymentMode === "self_pay" ? "Generate Link" : "Continue to Payment"}
              </Button>
            </div>
          </div>
        )}

        {stage === "submitting" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating link...</p>
          </div>
        )}

        {stage === "result" && resultLink && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="h-4 w-4 text-primary" /> Shareable link ready
            </div>

            <div className="flex justify-center">
              <div className="rounded-md border p-3 bg-white">
                <QRCodeSVG value={resultLink} size={180} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Signup URL</Label>
              <div className="flex gap-2">
                <Input value={resultLink} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={copyLink} className="w-full">
              <Copy className="h-4 w-4 mr-2" /> Copy link
            </Button>

            {resultExpiresAt && (
              <p className="text-sm text-muted-foreground">
                Link expires {format(new Date(resultExpiresAt), "MMM d, yyyy")}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Anyone with this link can sign up using this email address. The link will be removed from your pending invitations after 30 days or after redemption.
            </p>

            <div className="flex justify-end">
              <Button onClick={() => { onComplete(); resetAll(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
