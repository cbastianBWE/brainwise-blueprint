import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, Upload, Plus, Loader2 } from "lucide-react";

const INSTRUMENTS = [
  { id: "PTP",   uuid: "02618e9a-d411-44cf-b316-fe368edeac03", name: "Personal Threat Profile" },
  { id: "NAI",   uuid: "77d1290f-1daf-44e0-931f-b9b8ad185520", name: "Neuroscience Adoption Index" },
  { id: "AIRSA", uuid: "abb62120-8cc8-435f-babc-dd6a27fbc235", name: "AI Readiness Skills Assessment" },
  { id: "HSS",   uuid: "90216d9d-153c-4b7b-abe0-1d7845c9e6e0", name: "Habit Stabilization Scorecard" },
];

const MAX_ROWS = 75;
const PREVIEW_CONFIRMATION_THRESHOLD = 25;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface BulkRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  instrument_short_id: string;
  payment_mode: "self_pay" | "coach_paid";
  errors: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedInstrumentIds: Set<string>;
  perAssessmentPrice: number | null;
  onComplete: () => void;
}

type Stage = "validate" | "preview" | "dispatching" | "results";

const newId = () => Math.random().toString(36).slice(2);

function validateRow(r: BulkRow, allowed: Set<string>): string[] {
  const errs: string[] = [];
  if (!r.first_name.trim()) errs.push("First name required");
  if (!r.last_name.trim()) errs.push("Last name required");
  if (!r.email.trim()) errs.push("Email required");
  else if (!EMAIL_RE.test(r.email.trim())) errs.push("Invalid email");
  if (!r.instrument_short_id) errs.push("Instrument required");
  else if (!allowed.has(r.instrument_short_id)) errs.push("Instrument not certified");
  if (r.payment_mode !== "self_pay" && r.payment_mode !== "coach_paid") errs.push("Invalid payment mode");
  return errs;
}

function emptyRow(prev?: BulkRow): BulkRow {
  return {
    id: newId(),
    first_name: "",
    last_name: "",
    email: "",
    instrument_short_id: prev?.instrument_short_id ?? "",
    payment_mode: prev?.payment_mode ?? "self_pay",
    errors: [],
  };
}

export default function BulkInviteModal({
  open, onOpenChange, allowedInstrumentIds, perAssessmentPrice, onComplete,
}: Props) {
  const [stage, setStage] = useState<Stage>("validate");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [rpcResults, setRpcResults] = useState<any[]>([]);
  const [rpcSummary, setRpcSummary] = useState<any>(null);
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedInstruments = useMemo(
    () => INSTRUMENTS.filter(i => allowedInstrumentIds.has(i.id)),
    [allowedInstrumentIds]
  );

  const resetAll = () => {
    setStage("validate");
    setRows([]);
    setRpcResults([]);
    setRpcSummary(null);
    setConfirmReviewed(false);
    setSubmitting(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetAll();
    onOpenChange(o);
  };

  const updateRow = (id: string, patch: Partial<BulkRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      next.errors = validateRow(next, allowedInstrumentIds);
      return next;
    }));
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows(prev => [...prev, emptyRow(prev[prev.length - 1])]);
  };

  const deleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const setAllPayment = (mode: "self_pay" | "coach_paid") => {
    setRows(prev => prev.map(r => {
      const next = { ...r, payment_mode: mode };
      next.errors = validateRow(next, allowedInstrumentIds);
      return next;
    }));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const normKey = (k: string) => k.toLowerCase().trim().replace(/\s+/g, "_");
        const parsed: BulkRow[] = json.map((raw) => {
          const r: Record<string, string> = {};
          Object.keys(raw).forEach(k => { r[normKey(k)] = String(raw[k] ?? "").trim(); });
          const inst = (r.instrument || "").toUpperCase();
          const pmRaw = (r.payment_mode || "self_pay").toLowerCase();
          const pm: "self_pay" | "coach_paid" = pmRaw === "coach_paid" ? "coach_paid" : "self_pay";
          const row: BulkRow = {
            id: newId(),
            first_name: r.first_name || "",
            last_name: r.last_name || "",
            email: r.email || "",
            instrument_short_id: ["PTP", "NAI", "AIRSA", "HSS"].includes(inst) ? inst : "",
            payment_mode: pm,
            errors: [],
          };
          row.errors = validateRow(row, allowedInstrumentIds);
          return row;
        });

        if (rows.length + parsed.length > MAX_ROWS) {
          toast.error("CSV would exceed the 75-row limit. Trim and retry.");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        setRows(prev => [...prev, ...parsed]);
        toast.success(`Loaded ${parsed.length} rows from CSV`);
      } catch (err) {
        console.error("[BulkInviteModal] CSV parse error:", err);
        toast.error("Failed to parse CSV file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateAll = () => {
    setRows(prev => prev.map(r => ({ ...r, errors: validateRow(r, allowedInstrumentIds) })));
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const validSelfPay = validRows.filter(r => r.payment_mode === "self_pay");
  const validCoachPaid = validRows.filter(r => r.payment_mode === "coach_paid");
  const invalidRows = rows.filter(r => r.errors.length > 0);
  const coachPaidTotal = (perAssessmentPrice ?? 0) * validCoachPaid.length;
  const totalValid = validSelfPay.length + validCoachPaid.length;

  const continueDisabled =
    rows.length === 0 ||
    (perAssessmentPrice === null && rows.some(r => r.payment_mode === "coach_paid"));

  const handleContinue = () => {
    validateAll();
    setStage("preview");
  };

  const downloadInvalidCsv = () => {
    const data = invalidRows.map(r => ({
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      instrument: r.instrument_short_id,
      payment_mode: r.payment_mode,
      errors: r.errors.join("; "),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invalid");
    XLSX.writeFile(wb, "bulk-invite-invalid-rows.csv");
  };

  const handleSend = async () => {
    setStage("dispatching");
    setSubmitting(true);
    const payload = {
      rows: validRows.map(r => ({
        client_email: r.email.trim().toLowerCase(),
        client_first_name: r.first_name.trim() || null,
        client_last_name: r.last_name.trim() || null,
        instrument_id: INSTRUMENTS.find(i => i.id === r.instrument_short_id)?.uuid,
        payment_mode: r.payment_mode,
      })),
    };
    console.log("[BulkInviteModal] bulk_coach_invite payload:", payload);

    try {
      const { data, error } = await supabase.functions.invoke("bulk_coach_invite", {
        body: payload,
      });
      console.log("[BulkInviteModal] bulk_coach_invite response:", { data, error });

      if (error) {
        toast.error("Failed to dispatch batch: " + (error.message || "Edge function error"));
        setStage("preview");
        setSubmitting(false);
        return;
      }

      if (data?.bulk_batch) {
        console.log("[BulkInviteModal] coach-paid batch detected, redirecting to checkout");
        const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout", {
          body: { mode: "coach_bulk_order", batch_id: data.bulk_batch.batch_id },
        });
        console.log("[BulkInviteModal] create-checkout response:", { checkoutData, checkoutErr });
        if (checkoutErr || !checkoutData?.url) {
          toast.error("Bulk order created but checkout redirect failed. Self-pay rows were sent. Contact support if coach-paid rows are needed.");
          setRpcResults(data.results || []);
          setRpcSummary(data.summary || null);
          setStage("results");
          setSubmitting(false);
          return;
        }
        window.location.href = checkoutData.url;
        return;
      }

      setRpcResults(data?.results || []);
      setRpcSummary(data?.summary || null);
      setStage("results");
    } catch (err: any) {
      console.error("[BulkInviteModal] dispatch exception:", err);
      toast.error("Dispatch failed: " + (err?.message || "Unknown error"));
      setStage("preview");
    } finally {
      setSubmitting(false);
    }
  };

  const lookupInstrumentShort = (uuid: string) =>
    INSTRUMENTS.find(i => i.uuid === uuid)?.id || uuid;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Invite Clients</DialogTitle>
          <DialogDescription>
            Invite up to 75 clients at once. Mix self-pay and coach-paid invitations in a single batch.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2">
          {stage === "validate" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="text-sm text-muted-foreground">{rows.length} / {MAX_ROWS}</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAllPayment("self_pay")}>Set all to self-pay</Button>
                  <Button size="sm" variant="outline" onClick={() => setAllPayment("coach_paid")}>Set all to coach-paid</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Upload CSV
                  </Button>
                </div>
              </div>

              {allowedInstruments.length === 0 && (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  You don't have any active certifications. Complete a certification path to start ordering assessments.
                </div>
              )}

              {rows.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>First name</TableHead>
                        <TableHead>Last name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Instrument</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => {
                        const errMap: Record<string, string> = {};
                        r.errors.forEach(e => {
                          if (e.toLowerCase().includes("first")) errMap.first_name = e;
                          else if (e.toLowerCase().includes("last")) errMap.last_name = e;
                          else if (e.toLowerCase().includes("email")) errMap.email = e;
                          else if (e.toLowerCase().includes("instrument")) errMap.instrument_short_id = e;
                          else if (e.toLowerCase().includes("payment")) errMap.payment_mode = e;
                        });
                        const cellErr = (k: string) => errMap[k]
                          ? "border-destructive ring-1 ring-destructive/40"
                          : "";
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Input
                                value={r.first_name}
                                onChange={e => updateRow(r.id, { first_name: e.target.value })}
                                className={cellErr("first_name")}
                                title={errMap.first_name}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={r.last_name}
                                onChange={e => updateRow(r.id, { last_name: e.target.value })}
                                className={cellErr("last_name")}
                                title={errMap.last_name}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="email"
                                value={r.email}
                                onChange={e => updateRow(r.id, { email: e.target.value })}
                                className={cellErr("email")}
                                title={errMap.email}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={r.instrument_short_id}
                                onValueChange={v => updateRow(r.id, { instrument_short_id: v })}
                              >
                                <SelectTrigger className={cellErr("instrument_short_id")} title={errMap.instrument_short_id}>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allowedInstruments.map(i => (
                                    <SelectItem key={i.id} value={i.id}>{i.id}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={r.payment_mode}
                                onValueChange={(v: "self_pay" | "coach_paid") => updateRow(r.id, { payment_mode: v })}
                              >
                                <SelectTrigger className={cellErr("payment_mode")}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="self_pay">Self-pay</SelectItem>
                                  <SelectItem value="coach_paid">Coach-paid</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => deleteRow(r.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addRow}
                  disabled={rows.length >= MAX_ROWS}
                  title={rows.length >= MAX_ROWS ? "75-row limit reached" : undefined}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add row
                </Button>
                <Button onClick={handleContinue} disabled={continueDisabled}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {stage === "preview" && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                {validSelfPay.length} self-pay invitations will be sent immediately.{" "}
                {validCoachPaid.length} coach-paid invitations require payment of ${coachPaidTotal.toFixed(2)}.{" "}
                {invalidRows.length} rows have errors and will not be sent.
              </div>

              {validSelfPay.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Self-pay (will be sent)</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Email</TableHead><TableHead>Instrument</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {validSelfPay.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{r.email}</TableCell>
                            <TableCell>{r.instrument_short_id}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {validCoachPaid.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Coach-paid (require checkout)</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Email</TableHead><TableHead>Instrument</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {validCoachPaid.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{r.email}</TableCell>
                            <TableCell>{r.instrument_short_id}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {invalidRows.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-destructive">Invalid rows (will not be sent)</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Instrument</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invalidRows.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{r.email || "(blank)"}</TableCell>
                            <TableCell>{r.instrument_short_id || "(blank)"}</TableCell>
                            <TableCell className="text-xs text-destructive">{r.errors.join("; ")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {totalValid > PREVIEW_CONFIRMATION_THRESHOLD && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={confirmReviewed}
                    onCheckedChange={(c) => setConfirmReviewed(!!c)}
                  />
                  I have reviewed all {totalValid} invitations in this batch
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStage("validate")}>
                    Reject batch
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadInvalidCsv}
                    disabled={invalidRows.length === 0}
                  >
                    Download invalid rows as CSV
                  </Button>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={
                    totalValid === 0 ||
                    submitting ||
                    (totalValid > PREVIEW_CONFIRMATION_THRESHOLD && !confirmReviewed)
                  }
                >
                  Send batch
                </Button>
              </div>
            </div>
          )}

          {stage === "dispatching" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Sending invitations...</p>
            </div>
          )}

          {stage === "results" && (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rpcResults.map((res, i) => {
                      const status = res.email_failed
                        ? "email failed"
                        : res.success
                          ? "success"
                          : "failed";
                      const colorClass =
                        status === "success" ? "text-accent" :
                        status === "failed" ? "text-destructive" :
                        "text-yellow-600";
                      return (
                        <TableRow key={i}>
                          <TableCell>{res.client_email}</TableCell>
                          <TableCell>{res.instrument_id ? lookupInstrumentShort(res.instrument_id) : ""}</TableCell>
                          <TableCell>{res.payment_mode}</TableCell>
                          <TableCell className={colorClass}>{status}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{res.error || ""}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {rpcSummary && (
                <div className="text-sm text-muted-foreground">
                  {rpcSummary.rpc_succeeded ?? 0} succeeded, {rpcSummary.rpc_failed ?? 0} failed,{" "}
                  {rpcSummary.email_sent ?? 0} emails sent, {rpcSummary.email_failed ?? 0} emails failed.
                </div>
              )}

              {rpcResults.some((r: any) => r.email_failed) && (
                <div className="rounded-md border bg-yellow-50 p-3 text-xs text-yellow-900">
                  These coach-client records were created but the email did not send. The client can still sign up at the URL, you may want to contact them directly.
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={() => { onComplete(); resetAll(); }}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
