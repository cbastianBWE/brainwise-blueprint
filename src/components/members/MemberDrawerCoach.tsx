import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  { code: "INST-001", label: "PTP" },
  { code: "INST-002", label: "NAI" },
  { code: "INST-003", label: "AIRSA" },
  { code: "INST-004", label: "HSS" },
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

const CERT_LABELS: Record<string, string> = {
  ptp_coach: "PTP Certified Coach",
  ai_transformation_coach: "AI Transformation Certified Coach",
  ai_transformation_ptp_coach: "AI Transformation + PTP Certified Coach",
  my_brainwise_coach: "My BrainWise Coach",
};


export default function MemberDrawerCoach({
  userId,
  fullName,
  email,
  accountType,
  organizationName,
  setHasUnsavedChanges,
}: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");
  const [count, setCount] = useState<string>("1");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [markCertifyOpen, setMarkCertifyOpen] = useState(false);
  const [selectedCertType, setSelectedCertType] = useState<string>("");

  // Free client assessment grants (separate pool from certification pools)
  const [freeClientBalances, setFreeClientBalances] = useState<Record<string, number>>({});
  const [freeClientInstrument, setFreeClientInstrument] = useState<string>("");
  const [freeClientCount, setFreeClientCount] = useState<string>("1");
  const [freeClientGrantOpen, setFreeClientGrantOpen] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(grantDialogOpen || markCertifyOpen || freeClientGrantOpen);
  }, [grantDialogOpen, markCertifyOpen, freeClientGrantOpen, setHasUnsavedChanges]);

  const loadFreeClientPool = async () => {
    const { data, error } = await supabase.rpc(
      "admin_list_coach_free_pool" as any,
      { p_coach_user_id: userId } as any,
    );
    if (error) {
      console.error("admin_list_coach_free_pool error:", error);
      return;
    }
    const map: Record<string, number> = {};
    ((data ?? []) as any[]).forEach((row: any) => {
      if (row?.instrument_id) map[row.instrument_id] = Number(row.balance) || 0;
    });
    setFreeClientBalances(map);
  };

  useEffect(() => {
    loadFreeClientPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const renderFreeClientSummary = () => {
    const entries = INSTRUMENTS.filter((i) => (freeClientBalances[i.code] ?? 0) > 0);
    if (entries.length === 0) return "—";
    return entries.map((i) => `${i.label}: ${freeClientBalances[i.code]}`).join(", ");
  };

  const freeClientCountNum = Number(freeClientCount);
  const canOpenFreeClientDialog =
    !!freeClientInstrument &&
    Number.isFinite(freeClientCountNum) &&
    freeClientCountNum >= 1;


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

  const relQuery = useQuery({
    queryKey: ["coach-client-tracking", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("super_admin_coach_client_tracking" as any, { p_user_id: userId });
      if (error) throw error;
      return (data ?? []) as any[];
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

  const inProgressCerts = useMemo(
    () =>
      (certsQuery.data ?? []).filter(
        (c) => c.status === "in_progress" && c.certification_type,
      ),
    [certsQuery.data],
  );
  const hasPtpReport = useMemo(
    () =>
      (certsQuery.data ?? []).some(
        (c) =>
          c.certification_type === "ptp_coach" &&
          (c.status === "in_progress" || c.status === "certified"),
      ),
    [certsQuery.data],
  );
  const showCertActions = hasPtpReport || inProgressCerts.length > 0;

  const openMarkCertify = () => {
    const first = inProgressCerts[0]?.certification_type ?? "";
    setSelectedCertType(first);
    setMarkCertifyOpen(true);
  };


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

      {!relQuery.error && (relQuery.data?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Coach client & actor activity</h3>
          <div className="rounded-md border divide-y">
            {(relQuery.data ?? []).map((row, i) => (
              <div key={i} className="p-3 text-sm flex flex-wrap items-center gap-2">
                {row.is_actor ? (
                  <Badge>Actor</Badge>
                ) : (
                  <Badge variant="secondary">Coach client</Badge>
                )}
                <span className="text-muted-foreground">{row.invitation_status}</span>
                <span className="text-muted-foreground">·</span>
                <span>
                  {row.assessment_completed
                    ? `Completed ${new Date(row.completed_at).toLocaleDateString()}`
                    : "Not completed"}
                </span>
                {row.debrief_completed && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span>Debrief complete</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}



      {showCertActions && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Certification actions</h3>
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {hasPtpReport && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/super-admin/coach-report/${userId}`)}
                >
                  View PTP Report
                </Button>
              )}
              {inProgressCerts.length > 0 && (
                <Button size="sm" onClick={openMarkCertify}>
                  Mark Certified
                </Button>
              )}
            </div>
            {markCertifyOpen && inProgressCerts.length > 1 && (
              <div className="space-y-2">
                <Label>Certification</Label>
                <Select value={selectedCertType} onValueChange={setSelectedCertType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select certification" />
                  </SelectTrigger>
                  <SelectContent>
                    {inProgressCerts.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.certification_type as string}
                      >
                        {CERT_LABELS[c.certification_type as string] ??
                          formatAccountType(c.certification_type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <JustifiedActionDialog
            open={markCertifyOpen}
            onOpenChange={setMarkCertifyOpen}
            title="Mark coach as certified"
            description={
              <span>
                You are about to mark{" "}
                <strong>{fullName ?? email}</strong> as{" "}
                <strong>
                  {CERT_LABELS[selectedCertType] ??
                    formatAccountType(selectedCertType)}
                </strong>
                .
              </span>
            }
            successTitle="Coach certified"
            onSubmit={async () => {
              if (!user?.id || !selectedCertType) {
                throw new Error("Missing context");
              }
              const { error } = await supabase
                .from("coach_certifications")
                .update({
                  status: "certified",
                  certified_at: new Date().toISOString(),
                  certified_by: user.id,
                })
                .eq("user_id", userId)
                .eq("certification_type", selectedCertType)
                .eq("status", "in_progress");
              if (error) throw error;
              await queryClient.invalidateQueries({
                queryKey: ["coach-certifications", userId],
              });
              return { changed: true };
            }}
          />
        </section>
      )}



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
