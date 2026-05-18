import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    user_id: string;
    email: string;
    full_name: string | null;
    account_type: string | null;
    organization_name: string | null;
  } | null;
}

const INSTRUMENTS: { code: string; label: string }[] = [
  { code: "INST-001", label: "PTP" },
  { code: "INST-002", label: "NAI" },
  { code: "INST-003", label: "AIRSA" },
  { code: "INST-004", label: "HSS" },
];

const instrumentLabel = (code: string) =>
  INSTRUMENTS.find((i) => i.code === code)?.label ?? code;

const formatAccountType = (t: string | null): string => {
  if (!t) return "Unknown";
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

interface CertRow {
  id: string;
  certification_type: string | null;
  status: string | null;
  free_assessment_uses: Record<string, number> | null;
  free_uses_expire_at: string | null;
}

export default function UserDetailsModal({
  open,
  onOpenChange,
  target,
}: UserDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isCoach = target?.account_type === "coach";

  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");
  const [count, setCount] = useState<string>("1");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedCertId("");
      setSelectedInstrument("");
      setCount("1");
      setReason("");
      setSubmitting(false);
    }
  }, [open]);

  const certsQuery = useQuery({
    queryKey: ["coach-certifications", target?.user_id],
    enabled: open && isCoach && !!target?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_certifications")
        .select("id, certification_type, status, free_assessment_uses, free_uses_expire_at")
        .eq("user_id", target!.user_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CertRow[];
    },
  });

  const reasonLen = reason.trim().length;
  const countNum = Number(count);
  const canSubmit =
    !submitting &&
    !!selectedCertId &&
    !!selectedInstrument &&
    Number.isFinite(countNum) &&
    countNum >= 1 &&
    reasonLen >= 10;

  const handleGrant = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await (supabase as any).rpc(
      "grant_additional_free_attempts",
      {
        p_certification_id: selectedCertId,
        p_instrument_id: selectedInstrument,
        p_count: countNum,
        p_reason: reason.trim(),
      },
    );
    if (error) {
      const msg = (error.message || "").toLowerCase();
      let description = `Could not grant attempts: ${error.message}`;
      if (msg.includes("reason_required_min_chars"))
        description = "Please enter a justification of at least 10 characters.";
      else if (msg.includes("count_must_be_positive"))
        description = "Count must be a positive number.";
      else if (msg.includes("invalid_instrument_id"))
        description = "Please select a valid instrument.";
      else if (msg.includes("certification_not_found"))
        description = "That certification could not be found.";
      toast({ title: "Grant failed", description, variant: "destructive" });
    } else {
      toast({ title: `Granted ${countNum} attempt(s).` });
      setCount("1");
      setReason("");
      await queryClient.invalidateQueries({
        queryKey: ["coach-certifications", target!.user_id],
      });
    }
    setSubmitting(false);
  };

  const renderPool = (uses: Record<string, number> | null) => {
    if (!uses || Object.keys(uses).length === 0) return "—";
    return INSTRUMENTS.filter((i) => uses[i.code] != null)
      .map((i) => `${i.label}: ${uses[i.code]}`)
      .join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
        </DialogHeader>

        {!target ? null : (
          <div className="space-y-6">
            {/* Section 1 — User information */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">User information</h3>
              <div className="rounded-md border p-3 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  {target.full_name ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  {target.email}
                </div>
                <div>
                  <span className="text-muted-foreground">Account type: </span>
                  {formatAccountType(target.account_type)}
                </div>
                <div>
                  <span className="text-muted-foreground">Organization: </span>
                  {target.organization_name ?? "—"}
                </div>
              </div>
            </section>

            {/* Section 2 — Free assessment attempts (coach only) */}
            {isCoach && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Free assessment attempts</h3>

                {certsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading certifications…
                  </div>
                ) : certsQuery.error ? (
                  <p className="text-sm text-destructive">
                    Failed to load certifications.
                  </p>
                ) : !certsQuery.data || certsQuery.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    This coach has no certifications.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {certsQuery.data.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-md border p-3 text-sm space-y-1"
                        >
                          <div className="font-medium">
                            {formatAccountType(c.certification_type)}{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              · {c.status ?? "—"}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Pool: {renderPool(c.free_assessment_uses)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-md border p-3 space-y-3">
                      <div className="space-y-2">
                        <Label>Certification</Label>
                        <Select
                          value={selectedCertId}
                          onValueChange={setSelectedCertId}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select certification" />
                          </SelectTrigger>
                          <SelectContent>
                            {certsQuery.data.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {formatAccountType(c.certification_type)} ({c.status ?? "—"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Instrument</Label>
                        <Select
                          value={selectedInstrument}
                          onValueChange={setSelectedInstrument}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select instrument" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTRUMENTS.map((i) => (
                              <SelectItem key={i.code} value={i.code}>
                                {i.label} ({i.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Count</Label>
                        <Input
                          type="number"
                          min={1}
                          value={count}
                          onChange={(e) => setCount(e.target.value)}
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Justification reason</Label>
                        <Textarea
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="At least 10 characters explaining why…"
                          disabled={submitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          {reasonLen}/10 minimum characters
                        </p>
                      </div>

                      <Button
                        onClick={handleGrant}
                        disabled={!canSubmit}
                        className="w-full"
                      >
                        {submitting && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Grant attempts
                      </Button>

                      <p className="text-xs text-muted-foreground">
                        This action requires MFA and is audit-logged.
                      </p>
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
