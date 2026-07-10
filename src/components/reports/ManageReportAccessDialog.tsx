import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

interface ManagedReport {
  reportId: string;
  kind: "team" | "paired";
  title: string;
}

interface Props {
  report: ManagedReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CoachRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface GranteeRow {
  coach_user_id: string;
  full_name: string | null;
  email: string | null;
  granted_at: string;
  granted_by: string;
}

const DEFAULT_REVOKE_REASON =
  "Access removed by super admin from the report access manager.";

export default function ManageReportAccessDialog({ report, open, onOpenChange }: Props) {
  const [grantees, setGrantees] = useState<GranteeRow[]>([]);
  const [loadingGrantees, setLoadingGrantees] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoachRow[]>([]);
  const [selected, setSelected] = useState<CoachRow[]>([]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const loadGrantees = useCallback(async () => {
    if (!report) return;
    setLoadingGrantees(true);
    const { data, error } = await supabase.rpc("admin_list_report_grantees" as never, {
      p_report_type: report.kind,
      p_report_id: report.reportId,
    } as never);
    if (!error) setGrantees(((data as GranteeRow[]) ?? []));
    setLoadingGrantees(false);
  }, [report]);

  useEffect(() => {
    if (open && report) loadGrantees();
  }, [open, report, loadGrantees]);

  useEffect(() => {
    if (!open) {
      setGrantees([]);
      setQuery("");
      setResults([]);
      setSelected([]);
      setReason("");
      setSubmitting(false);
      setRevokingId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !report) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("admin_search_coaches" as never, { p_query: query } as never);
      if (!error) setResults(((data as CoachRow[]) ?? []));
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open, report]);

  const granteeIds = useMemo(() => new Set(grantees.map((g) => g.coach_user_id)), [grantees]);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.user_id)), [selected]);

  const toggleSelect = (row: CoachRow) => {
    setSelected((prev) => {
      const has = prev.find((p) => p.user_id === row.user_id);
      if (has) return prev.filter((p) => p.user_id !== row.user_id);
      return [...prev, row];
    });
  };

  const reasonValid = reason.trim().length >= 10;
  const canAssign = !submitting && selected.length > 0 && reasonValid;

  const handleAssign = async () => {
    if (!report || !canAssign) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("admin_grant_report_access_bulk" as never, {
      p_report_type: report.kind,
      p_report_id: report.reportId,
      p_coach_user_ids: selected.map((s) => s.user_id),
      p_reason: reason.trim(),
    } as never);
    if (error) {
      toast.error("Could not assign access. Please try again.");
      setSubmitting(false);
      return;
    }
    const res = data as { granted_count?: number; already_granted?: string[]; invalid?: string[] };
    const n = res?.granted_count ?? 0;
    if (n > 0) toast.success(`Granted access to ${n} coach${n === 1 ? "" : "es"}.`);
    else toast.info("No new access granted.");
    if (res?.invalid && res.invalid.length > 0) {
      toast.warning(`${res.invalid.length} selected user(s) could not be found.`);
    }
    setSelected([]);
    setSubmitting(false);
    await loadGrantees();
  };

  const handleRevoke = async (coachId: string) => {
    if (!report) return;
    setRevokingId(coachId);
    const { error } = await supabase.rpc("admin_revoke_report_access" as never, {
      p_report_type: report.kind,
      p_report_id: report.reportId,
      p_coach_user_id: coachId,
      p_reason: reasonValid ? reason.trim() : DEFAULT_REVOKE_REASON,
    } as never);
    if (error) {
      toast.error("Could not remove access. Please try again.");
      setRevokingId(null);
      return;
    }
    toast.success("Access removed.");
    setRevokingId(null);
    await loadGrantees();
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(); } catch { return ""; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage report access</DialogTitle>
          <DialogDescription>
            {report ? `${report.kind === "team" ? "Team" : "Paired"} report: ${report.title}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label>Coaches with access</Label>
            {loadingGrantees ? (
              <div className="py-6 text-sm text-muted-foreground text-center">Loading...</div>
            ) : grantees.length === 0 ? (
              <div className="border rounded-md px-3 py-6 text-sm text-muted-foreground text-center">
                No coaches have access yet.
              </div>
            ) : (
              <div className="border rounded-md divide-y">
                {grantees.map((g) => (
                  <div key={g.coach_user_id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{g.full_name ?? "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {g.email} · granted {formatDate(g.granted_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(g.coach_user_id)}
                      disabled={revokingId === g.coach_user_id}
                    >
                      {revokingId === g.coach_user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (required, min 10 characters)</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Add coaches</Label>
            <Input placeholder="Search coaches by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
              {results.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">No coaches found.</div>
              ) : (
                results.map((row) => {
                  const alreadyHasAccess = granteeIds.has(row.user_id);
                  const checked = selectedIds.has(row.user_id);
                  return (
                    <label key={row.user_id} className={`flex items-center gap-3 px-3 py-2 ${alreadyHasAccess ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"}`}>
                      <Checkbox checked={checked} disabled={alreadyHasAccess} onCheckedChange={() => toggleSelect(row)} />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm">{row.full_name ?? "Unnamed"}</span>
                        <span className="block truncate text-xs text-muted-foreground">{row.email}</span>
                      </span>
                      {alreadyHasAccess && <Badge variant="outline" className="shrink-0">Has access</Badge>}
                    </label>
                  );
                })
              )}
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selected.map((row) => (
                  <Badge key={row.user_id} variant="secondary" className="gap-1">
                    {row.full_name ?? "Unnamed"}
                    <button type="button" onClick={() => toggleSelect(row)} className="ml-1"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Close</Button>
          <Button onClick={handleAssign} disabled={!canAssign}>
            {submitting ? "Assigning..." : `Assign${selected.length > 0 ? ` (${selected.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
