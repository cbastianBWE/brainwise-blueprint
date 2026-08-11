import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface ReportCapacityRequestRow {
  id: string;
  organization_id: string;
  org_name: string;
  report_type: "team" | "paired";
  requested_by: string;
  requested_by_name: string;
  subject_user_ids: string[];
  relationship_mode: string | null;
  included_qty_at_request: number;
  used_at_request: number;
  status: "pending" | "granted" | "declined" | "cancelled";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

function statusBadge(status: ReportCapacityRequestRow["status"]) {
  if (status === "pending") {
    return <Badge style={{ background: "#F59E0B", color: "white" }}>Pending</Badge>;
  }
  if (status === "granted") {
    return <Badge style={{ background: "#2D6A4F", color: "white" }}>Granted</Badge>;
  }
  return <Badge variant="secondary">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export default function CompanyReportRequestsSection({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [selected, setSelected] = useState<ReportCapacityRequestRow | null>(null);
  const [outcome, setOutcome] = useState<"granted" | "declined">("granted");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["org-report-capacity-requests", orgId],
    queryFn: async (): Promise<ReportCapacityRequestRow[]> => {
      const { data, error } = await supabase.rpc("list_report_capacity_requests", {
        p_status: null,
      });
      if (error) throw error;
      return ((data ?? []) as ReportCapacityRequestRow[]).filter(
        (r) => r.organization_id === orgId
      );
    },
    staleTime: 10_000,
  });

  const rows = (data ?? []).filter((r) => (showResolved ? true : r.status === "pending"));

  const openResolve = (row: ReportCapacityRequestRow) => {
    setSelected(row);
    setOutcome("granted");
    setNote("");
  };

  const closeResolve = () => {
    if (submitting) return;
    setSelected(null);
    setNote("");
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("resolve_report_capacity_request", {
        p_request_id: selected.id,
        p_status: outcome,
        p_note: note.trim() || null,
      });
      if (error) throw error;
      toast({
        title: outcome === "granted" ? "Request marked granted" : "Request declined",
        description: "The request has been resolved.",
      });
      setSelected(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["org-report-capacity-requests", orgId] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Resolve failed", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Capacity Requests</CardTitle>
        <CardDescription>
          Requests from this organization to expand their team and paired report allowance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            id={`show-resolved-${orgId}`}
            checked={showResolved}
            onCheckedChange={setShowResolved}
          />
          <Label htmlFor={`show-resolved-${orgId}`} className="cursor-pointer">
            Show resolved
          </Label>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {error && (
          <div className="text-destructive text-sm">
            Error loading requests: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No requests from this organization.</p>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Included / Used</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.report_type.charAt(0).toUpperCase() + row.report_type.slice(1)}
                  </TableCell>
                  <TableCell>{row.requested_by_name}</TableCell>
                  <TableCell className="text-sm">
                    {row.included_qty_at_request} / {row.used_at_request}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(row.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell>
                    {row.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => openResolve(row)}>
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && closeResolve()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve request</DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  {selected.org_name} — {selected.report_type} report
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select
                value={outcome}
                onValueChange={(v) => setOutcome(v as "granted" | "declined")}
                disabled={submitting}
              >
                <SelectTrigger id="outcome">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="granted">Approve</SelectItem>
                  <SelectItem value="declined">Decline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Internal note about this resolution."
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeResolve} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
