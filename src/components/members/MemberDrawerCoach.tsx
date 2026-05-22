import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JustifiedActionDialog from "@/components/justified-action/JustifiedActionDialog";

interface Props {
  userId: string;
  fullName: string | null;
  email: string;
  accountType: string | null;
  organizationName: string | null;
  setHasUnsavedChanges: (v: boolean) => void;
}

const INSTRUMENTS: { code: string; label: string }[] = [
  { code: "PTP", label: "PTP" },
  { code: "NAI", label: "NAI" },
  { code: "AIRSA", label: "AIRSA" },
  { code: "HSS", label: "HSS" },
];

interface CertRow {
  id: string;
  certification_type: string | null;
  status: string | null;
  free_assessment_uses: Record<string, number> | null;
  free_uses_expire_at: string | null;
}

const formatAccountType = (t: string | null): string => {
  if (!t) return "—";
  return t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const renderPool = (uses: Record<string, number> | null) => {
  if (!uses || Object.keys(uses).length === 0) return "—";
  return INSTRUMENTS.filter((i) => uses[i.code] != null)
    .map((i) => `${i.label}: ${uses[i.code]}`)
    .join(", ");
};

const instrumentLabel = (code: string) =>
  INSTRUMENTS.find((i) => i.code === code)?.label ?? code;

export default function MemberDrawerCoach({
  userId,
  fullName,
  email,
  accountType,
  organizationName,
  setHasUnsavedChanges,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");
  const [count, setCount] = useState<string>("1");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(grantDialogOpen);
  }, [grantDialogOpen, setHasUnsavedChanges]);

  const certsQuery = useQuery({
    queryKey: ["coach-certifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_certifications")
        .select("id, certification_type, status, free_assessment_uses, free_uses_expire_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CertRow[];
    },
  });

  const countNum = Number(count);
  const canOpenDialog =
    !!selectedCertId &&
    !!selectedInstrument &&
    Number.isFinite(countNum) &&
    countNum >= 1;

  const selectedCertLabel =
    certsQuery.data?.find((c) => c.id === selectedCertId)?.certification_type ??
    "this certification";

  return (
    <div className="p-4 space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">User information</h3>
        <div className="rounded-md border p-3 text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Name: </span>
            {fullName ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            {email}
          </div>
          <div>
            <span className="text-muted-foreground">Account type: </span>
            {formatAccountType(accountType)}
          </div>
          <div>
            <span className="text-muted-foreground">Organization: </span>
            {organizationName ?? "—"}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Free assessment attempts</h3>

        {certsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading certifications…
          </div>
        ) : certsQuery.error ? (
          <p className="text-sm text-destructive">Failed to load certifications.</p>
        ) : !certsQuery.data || certsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            This user has no certifications.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {certsQuery.data.map((c) => (
                <div key={c.id} className="rounded-md border p-3 text-sm space-y-1">
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
                <Select value={selectedCertId} onValueChange={setSelectedCertId}>
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
                <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instrument" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map((i) => (
                      <SelectItem key={i.code} value={i.code}>
                        {i.label}
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
                />
              </div>

              <Button
                onClick={() => setGrantDialogOpen(true)}
                disabled={!canOpenDialog}
                className="w-full"
              >
                Grant attempts
              </Button>

              <p className="text-xs text-muted-foreground">
                This action is audit-logged.
              </p>
            </div>

            <JustifiedActionDialog
              open={grantDialogOpen}
              onOpenChange={setGrantDialogOpen}
              title="Grant additional free attempts"
              description={
                <span>
                  You are about to grant <strong>{count}</strong> additional{" "}
                  <strong>{instrumentLabel(selectedInstrument)}</strong> attempt(s) on{" "}
                  <strong>{selectedCertLabel}</strong> for{" "}
                  <strong>{fullName ?? "this user"}</strong>.
                </span>
              }
              successTitle={`Granted ${count} attempt(s)`}
              onSubmit={async (reason) => {
                const { error } = await supabase.rpc(
                  "grant_additional_free_attempts" as any,
                  {
                    p_certification_id: selectedCertId,
                    p_instrument_id: selectedInstrument,
                    p_count: Number(count),
                    p_reason: reason,
                  } as any,
                );
                if (error) throw error;
                await queryClient.invalidateQueries({
                  queryKey: ["coach-certifications", userId],
                });
                setCount("1");
                setSelectedInstrument("");
                return { changed: true };
              }}
              mapError={(raw) => {
                if (raw.includes("count_must_be_positive"))
                  return "Count must be a positive number.";
                if (raw.includes("invalid_instrument_id"))
                  return "Please select a valid instrument.";
                if (raw.includes("certification_not_found"))
                  return "That certification could not be found.";
                return null;
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
