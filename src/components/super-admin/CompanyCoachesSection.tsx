import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, UserPlus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface OrgCoach {
  coach_user_id: string;
  full_name: string | null;
  email: string;
  assigned_at: string;
  note: string | null;
}
interface CoachHit { user_id: string; full_name: string | null; email: string; }

// NOTE: (supabase.rpc as any) casts are intentional — generated types are stale this session.
export default function CompanyCoachesSection({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<OrgCoach[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CoachHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const searchSeq = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("org_list_coaches", { p_org: orgId });
    if (!error) setCoaches((data as OrgCoach[]) ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!addOpen) return;
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await (supabase.rpc as any)("admin_search_coaches", { p_query: q });
      if (seq === searchSeq.current) {
        setHits((data as CoachHit[]) ?? []);
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, addOpen]);

  const assignedIds = new Set(coaches.map(c => c.coach_user_id));

  const assign = async (coachUserId: string) => {
    setAssigningId(coachUserId);
    const { error } = await (supabase.rpc as any)("org_assign_coach", {
      p_organization_id: orgId, p_coach_user_id: coachUserId, p_note: null,
    });
    setAssigningId(null);
    if (error) { toast({ title: "Couldn't assign coach", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Coach assigned" });
    setAddOpen(false); setQuery(""); setHits([]);
    load();
  };

  const unassign = async (coachUserId: string) => {
    setRemoving(coachUserId);
    const { error } = await (supabase.rpc as any)("org_unassign_coach", {
      p_organization_id: orgId, p_coach_user_id: coachUserId,
    });
    setRemoving(null);
    if (error) { toast({ title: "Couldn't remove coach", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Coach removed" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Organization Coaches</CardTitle>
          <CardDescription>
            An assigned coach can view and coach every member of this organization
            (results, development plans, coaching, and team/paired reports).
          </CardDescription>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" /> Assign coach
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : coaches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No coaches assigned to this organization yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coach</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map(c => (
                <TableRow key={c.coach_user_id}>
                  <TableCell>{c.full_name || "—"}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.assigned_at ? format(new Date(c.assigned_at), "MMM d, yyyy") : ""}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => unassign(c.coach_user_id)}
                      disabled={removing === c.coach_user_id}
                    >
                      {removing === c.coach_user_id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setQuery(""); setHits([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign a coach</DialogTitle>
            <DialogDescription>Search certified coaches by name or email.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coaches…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {searching && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && query.trim().length >= 2 && hits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No coaches found.</p>
            )}
            {hits.map(h => {
              const already = assignedIds.has(h.user_id);
              return (
                <div key={h.user_id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{h.full_name || h.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={already ? "secondary" : "default"}
                    disabled={already || assigningId === h.user_id}
                    onClick={() => assign(h.user_id)}
                  >
                    {assigningId === h.user_id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : already ? "Assigned" : "Assign"}
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
