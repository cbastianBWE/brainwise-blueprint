import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, X, Loader2 } from "lucide-react";

type Mode = "work" | "personal" | "romantic";

interface SubjectRow {
  user_id: string;
  full_name: string | null;
  organization_id: string | null;
  last_completed_at: string | null;
}

interface PayerCandidate {
  user_id: string;
  full_name: string | null;
  has_email: boolean;
  is_subject: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedModes: Mode[];
  onGenerated: () => void;
  isSuperAdmin: boolean;
}

const TEAM_PRICE_LABEL = "Team report — $399";
const PAIRED_PRICE_LABEL = "Paired report — $39";

async function readErrorMessage(error: unknown): Promise<string> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string; message?: string }> } })?.context;
    if (ctx?.json) {
      const body = await ctx.json();
      return body?.error ?? body?.message ?? "";
    }
  } catch {
    // ignore
  }
  const msg = (error as { message?: string })?.message;
  return msg ?? "";
}

function mapErrorToToast(raw: string | null): string {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("min_team_size_6")) return "A team needs at least 6 people.";
  if (s.includes("subjects_without_completed_ptp")) return "Some selected people have not completed a PTP yet.";
  if (s.includes("forbidden_for_subject_set") || s.includes("forbidden_for_pair_or_mode"))
    return "You are not allowed to generate this report for those people.";
  if (s.includes("subjects_must_differ")) return "Pick two different people.";
  if (s.includes("not_authorized_to_order")) return "You don't have permission to order reports.";
  if (s.includes("not_authorized_to_generate")) return "You're not allowed to build a report for those people.";
  if (s.includes("paired_requires_two_subjects")) return "Pick exactly two people for a paired report.";
  if (s.includes("invalid_relationship_mode")) return "Choose a relationship mode.";
  if (s.includes("client_selection_required")) return "Choose who should receive the payment link.";
  if (s.includes("client_must_be_a_subject")) return "The payer has to be one of the people in this report.";
  if (s.includes("client_must_be_in_organization")) return "The payer has to belong to this team's organization.";
  if (s.includes("client_has_no_email")) return "That person has no email on file, so they can't be sent a link.";
  if (s.includes("order_not_payable")) return "This order has already been paid or cancelled.";
  if (s.includes("order_not_yours")) return "That order belongs to someone else.";
  return "Could not generate report. Please try again.";
}

export default function GenerateReportDialog({ open, onOpenChange, allowedModes, onGenerated, isSuperAdmin }: Props) {
  const navigate = useNavigate();
  const [kind, setKind] = useState<"team" | "paired">("team");
  const [mode, setMode] = useState<Mode>(allowedModes[0] ?? "work");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SubjectRow[]>([]);
  const [selected, setSelected] = useState<SubjectRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reportLabel, setReportLabel] = useState("");
  const [releaseNow, setReleaseNow] = useState(false);

  // Who pays
  const [payer, setPayer] = useState<"coach" | "client">("coach");
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [teamCandidates, setTeamCandidates] = useState<PayerCandidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState(false);
  const [payerSearch, setPayerSearch] = useState("");

  const debounceRef = useRef<number | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setKind("team");
      setMode(allowedModes[0] ?? "work");
      setQuery("");
      setResults([]);
      setSelected([]);
      setSubmitting(false);
      setReportLabel("");
      setReleaseNow(false);
      setPayer("coach");
      setClientUserId(null);
      setTeamCandidates(null);
      setCandidatesLoading(false);
      setCandidatesError(false);
      setPayerSearch("");
    }
  }, [open, allowedModes]);

  // Search subjects (debounced)
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("bw_list_report_subjects", { p_search: query });
      if (error) return;
      setResults(((data as SubjectRow[]) ?? []));
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.user_id)), [selected]);
  const subjectIds = useMemo(() => selected.map((s) => s.user_id), [selected]);

  // Load team payer candidates when needed
  useEffect(() => {
    if (isSuperAdmin) return;
    if (kind !== "team" || payer !== "client") {
      setTeamCandidates(null);
      setCandidatesError(false);
      return;
    }
    if (subjectIds.length < 6) {
      setTeamCandidates(null);
      return;
    }
    let cancelled = false;
    setCandidatesLoading(true);
    setCandidatesError(false);
    (async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>)(
        "bw_list_team_payer_candidates",
        { p_subject_user_ids: subjectIds },
      );
      if (cancelled) return;
      setCandidatesLoading(false);
      if (error) {
        setCandidatesError(true);
        setTeamCandidates(null);
        return;
      }
      setTeamCandidates(((data as PayerCandidate[]) ?? []));
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, kind, payer, subjectIds]);

  // Clear stale payer if subjects changed
  useEffect(() => {
    if (!clientUserId) return;
    if (kind === "paired") {
      if (!selectedIds.has(clientUserId)) setClientUserId(null);
    } else if (teamCandidates) {
      const ok = teamCandidates.some((c) => c.user_id === clientUserId && c.has_email);
      if (!ok) setClientUserId(null);
    }
  }, [selectedIds, teamCandidates, kind, clientUserId]);

  // Reset payer state when kind toggles
  useEffect(() => {
    setPayer("coach");
    setClientUserId(null);
    setTeamCandidates(null);
    setPayerSearch("");
  }, [kind]);

  const toggleSelect = (row: SubjectRow) => {
    setSelected((prev) => {
      const has = prev.find((p) => p.user_id === row.user_id);
      if (has) return prev.filter((p) => p.user_id !== row.user_id);
      if (kind === "paired" && prev.length >= 2) return prev;
      return [...prev, row];
    });
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setSelected((prev) => {
      const copy = [...prev];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  };
  const moveDown = (idx: number) => {
    setSelected((prev) => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
      return copy;
    });
  };
  const remove = (id: string) => setSelected((prev) => prev.filter((p) => p.user_id !== id));

  const subjectCountOk = kind === "team" ? selected.length >= 6 : selected.length === 2;
  const payerOk =
    isSuperAdmin ||
    payer === "coach" ||
    (payer === "client" && !!clientUserId && (kind === "paired" || (!!teamCandidates && !candidatesError)));

  const canGenerate = !submitting && subjectCountOk && payerOk;

  const priceLabel = kind === "team" ? TEAM_PRICE_LABEL : PAIRED_PRICE_LABEL;

  const filteredTeamCandidates = useMemo(() => {
    if (!teamCandidates) return [];
    const q = payerSearch.trim().toLowerCase();
    if (!q) return teamCandidates;
    return teamCandidates.filter((c) => (c.full_name ?? "").toLowerCase().includes(q));
  }, [teamCandidates, payerSearch]);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const ids = selected.map((s) => s.user_id);

      // Step 1 — always create the order (super_admin path returns requires_payment=false)
      const rpcArgs: Record<string, unknown> = {
        p_order_type: kind,
        p_subject_user_ids: ids,
        p_instrument_id: "INST-001",
        p_relationship_mode: kind === "paired" ? mode : null,
        p_team_id: null,
        p_payer: isSuperAdmin ? "coach" : payer,
        p_client_user_id: !isSuperAdmin && payer === "client" ? clientUserId : null,
        p_release_now: releaseNow,
        p_report_label: kind === "team" ? (reportLabel.trim() || null) : null,
      };

      const { data: orderResult, error: orderErr } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>)(
        "create_report_order",
        rpcArgs,
      );

      if (orderErr) {
        toast.error(mapErrorToToast(orderErr.message ?? null));
        setSubmitting(false);
        return;
      }

      const result = orderResult as {
        requires_payment: boolean;
        order_id?: string;
        order_type?: "team" | "paired";
        payer?: "coach" | "client";
        client_name?: string;
      };

      const blockedResult = orderResult as { blocked?: boolean; order_type?: "team" | "paired"; included?: number; used?: number; billing_mode?: string; included_remaining?: number | null };
      if (blockedResult?.blocked === true) {
        toast.info(
          `This organization has reached its included ${kind} report limit. A request has been sent to a BrainWise administrator to add capacity — you can order again once it's approved.`
        );
        onGenerated();
        onOpenChange(false);
        setSubmitting(false);
        return;
      }

      // Super admin / free path — preserve original behaviour exactly
      if (result?.requires_payment === false) {
        if (kind === "team") {
          const { data, error } = await supabase.functions.invoke("generate-team-profile", {
            body: { subject_user_ids: ids },
          });
          if (error) {
            const msg = await readErrorMessage(error);
            toast.error(mapErrorToToast(msg));
            setSubmitting(false);
            return;
          }
          const id = (data as { team_profile_id: string }).team_profile_id;
          if (releaseNow) {
            try { await supabase.rpc("bw_set_report_release" as never, { p_profile: id, p_kind: "team", p_released: true } as never); } catch { /* held by default */ }
          }
          if (reportLabel.trim()) {
            try { await supabase.rpc("bw_set_report_label" as never, { p_profile: id, p_label: reportLabel.trim() } as never); } catch { /* cosmetic */ }
          }
          if (blockedResult?.billing_mode === "included") {
            const rem = blockedResult.included_remaining;
            toast.success(rem === null || rem === undefined ? "Report generated (covered by your organization)." : `Report generated. ${rem} included ${kind} report${rem === 1 ? "" : "s"} remaining.`);
          }
          onGenerated();
          onOpenChange(false);
          navigate(`/team-report/${id}`);
        } else {
          const { data, error } = await supabase.functions.invoke("generate-paired-profile", {
            body: { user_a: ids[0], user_b: ids[1], relationship_mode: mode },
          });
          if (error) {
            const msg = await readErrorMessage(error);
            toast.error(mapErrorToToast(msg));
            setSubmitting(false);
            return;
          }
          const id = (data as { paired_profile_id: string }).paired_profile_id;
          if (releaseNow) {
            try { await supabase.rpc("bw_set_report_release" as never, { p_profile: id, p_kind: "paired", p_released: true } as never); } catch { /* held */ }
          }
          onGenerated();
          onOpenChange(false);
          navigate(`/paired-report/${id}`);
        }
        return;
      }

      // Paid path — do NOT call release / label RPCs; server applies from the order at generation.
      const orderId = result.order_id!;
      const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout", {
        body: { mode: "report_order", order_id: orderId },
      });
      if (checkoutErr) {
        const msg = await readErrorMessage(checkoutErr);
        toast.error(mapErrorToToast(msg));
        setSubmitting(false);
        return;
      }
      const checkout = checkoutData as { url?: string; payer: "coach" | "client" };
      if (checkout.payer === "coach") {
        if (checkout.url) {
          window.location.href = checkout.url;
          return; // leaving the page
        }
        toast.error("Couldn't start checkout. Please try again.");
        setSubmitting(false);
        return;
      }
      // payer === 'client'
      const name = result.client_name ?? "the participant";
      toast.success(`Payment link sent to ${name}. The report generates automatically once they pay.`);
      onGenerated();
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not generate report. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate report</DialogTitle>
          <DialogDescription>
            Build a team or paired report from people you can read.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Report type */}
          <div className="space-y-2">
            <Label>Report type</Label>
            <RadioGroup
              value={kind}
              onValueChange={(v) => {
                setKind(v as "team" | "paired");
                setSelected([]);
              }}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="kind-team" value="team" />
                <Label htmlFor="kind-team" className="font-normal cursor-pointer">Team</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="kind-paired" value="paired" />
                <Label htmlFor="kind-paired" className="font-normal cursor-pointer">Paired</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Participant visibility */}
          <div className="space-y-2">
            <Label>Participant visibility</Label>
            <RadioGroup
              value={releaseNow ? "release" : "hold"}
              onValueChange={(v) => setReleaseNow(v === "release")}
              className="space-y-2"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem id="vis-hold" value="hold" className="mt-1" />
                <div>
                  <Label htmlFor="vis-hold" className="font-normal cursor-pointer">Hold for debrief</Label>
                  <p className="text-xs text-muted-foreground">
                    Participants can't see the report until you release it. You can still open it yourself.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem id="vis-release" value="release" className="mt-1" />
                <div>
                  <Label htmlFor="vis-release" className="font-normal cursor-pointer">Release to participants now</Label>
                  <p className="text-xs text-muted-foreground">
                    Participants can see the finished report as soon as it's ready.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Report name (team only, optional) */}
          {kind === "team" && (
            <div className="space-y-2">
              <Label htmlFor="report-label">Report name (optional)</Label>
              <Input
                id="report-label"
                placeholder="e.g. Product leadership Q4"
                value={reportLabel}
                onChange={(e) => setReportLabel(e.target.value)}
                maxLength={120}
              />
            </div>
          )}

          {/* Mode (paired only) */}
          {kind === "paired" && (
            <div className="space-y-2">
              <Label>Relationship mode</Label>
              {allowedModes.length === 1 ? (
                <div>
                  <Badge variant="secondary" className="capitalize">{allowedModes[0]}</Badge>
                </div>
              ) : (
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as Mode)}
                  className="flex gap-6"
                >
                  {allowedModes.map((m) => (
                    <div key={m} className="flex items-center gap-2">
                      <RadioGroupItem id={`mode-${m}`} value={m} />
                      <Label htmlFor={`mode-${m}`} className="font-normal capitalize cursor-pointer">{m}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          {/* Subjects */}
          <div className="space-y-2">
            <Label>Subjects</Label>
            <Input
              placeholder="Search people"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
              {results.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  No people found.
                </div>
              ) : (
                results.map((row) => {
                  const checked = selectedIds.has(row.user_id);
                  const disabled = !checked && kind === "paired" && selected.length >= 2;
                  return (
                    <label
                      key={row.user_id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => toggleSelect(row)}
                      />
                      <span className="text-sm">{row.full_name ?? "Unnamed"}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              {kind === "team"
                ? `${selected.length} of 6 minimum`
                : `${selected.length} of 2 selected`}
            </div>

            {selected.length > 0 && (
              <div className="space-y-1 pt-2">
                {selected.map((row, idx) => (
                  <div
                    key={row.user_id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {kind === "paired" && (
                        <Badge variant="outline" className="shrink-0">
                          {idx === 0 ? "A" : "B"}
                        </Badge>
                      )}
                      <span className="truncate">{row.full_name ?? "Unnamed"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {kind === "paired" && (
                        <>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveUp(idx)} disabled={idx === 0}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDown(idx)} disabled={idx === selected.length - 1}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(row.user_id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Who pays — non super-admins only */}
          {!isSuperAdmin && (
            <div className="space-y-3 border-t pt-4">
              <Label>Who pays</Label>
              <RadioGroup
                value={payer}
                onValueChange={(v) => {
                  setPayer(v as "coach" | "client");
                  setClientUserId(null);
                  setPayerSearch("");
                }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="payer-coach" value="coach" />
                  <Label htmlFor="payer-coach" className="font-normal cursor-pointer">I'll pay</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="payer-client" value="client" />
                  <Label htmlFor="payer-client" className="font-normal cursor-pointer">Send a payment link to a participant</Label>
                </div>
              </RadioGroup>

              {payer === "client" && (
                <div className="space-y-2 pl-2">
                  <Label className="text-sm">Who should receive the payment link?</Label>

                  {kind === "paired" ? (
                    selected.length !== 2 ? (
                      <p className="text-xs text-muted-foreground">Select two people above first.</p>
                    ) : (
                      <RadioGroup
                        value={clientUserId ?? ""}
                        onValueChange={(v) => setClientUserId(v)}
                        className="space-y-2"
                      >
                        {selected.map((s) => (
                          <div key={s.user_id} className="flex items-center gap-2">
                            <RadioGroupItem id={`payerpick-${s.user_id}`} value={s.user_id} />
                            <Label htmlFor={`payerpick-${s.user_id}`} className="font-normal cursor-pointer">
                              {s.full_name ?? "Unnamed"}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )
                  ) : (
                    // team
                    selected.length < 6 ? (
                      <p className="text-xs text-muted-foreground">Select at least 6 people above first.</p>
                    ) : candidatesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : candidatesError ? (
                      <p className="text-sm text-destructive">Couldn't load who can pay for this report.</p>
                    ) : (
                      <>
                        <Input
                          placeholder="Search people"
                          value={payerSearch}
                          onChange={(e) => setPayerSearch(e.target.value)}
                        />
                        <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                          {filteredTeamCandidates.length === 0 ? (
                            <div className="px-3 py-6 text-sm text-muted-foreground text-center">No matches.</div>
                          ) : (
                            filteredTeamCandidates.map((c) => {
                              const disabled = !c.has_email;
                              const selectedRow = clientUserId === c.user_id;
                              return (
                                <label
                                  key={c.user_id}
                                  className={`flex items-center justify-between gap-3 px-3 py-2 ${
                                    disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"
                                  } ${selectedRow ? "bg-muted/60" : ""}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="radio"
                                      name="team-payer"
                                      className="h-4 w-4"
                                      checked={selectedRow}
                                      disabled={disabled}
                                      onChange={() => setClientUserId(c.user_id)}
                                    />
                                    <span className="text-sm truncate">{c.full_name ?? "Unnamed"}</span>
                                    {c.is_subject && (
                                      <Badge variant="outline" className="text-xs">In this report</Badge>
                                    )}
                                  </div>
                                  {!c.has_email && (
                                    <span className="text-xs text-muted-foreground">no email on file</span>
                                  )}
                                </label>
                              );
                            })
                          )}
                        </div>
                      </>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {!isSuperAdmin && (
            <div className="text-sm text-muted-foreground sm:mr-auto">{priceLabel}</div>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={!canGenerate}>
              {submitting ? "Working…" : "Generate"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
