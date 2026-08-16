import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { PD_BUCKET } from "@/lib/practitionerDirectory";

interface AdminRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  slug: string | null;
  moderation_status: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  listed: boolean | null;
  missing_fields: string[] | null;
  draft: Record<string, any> | null;
  approved_payload: Record<string, any> | null;
}

const STATUSES = ["submitted", "draft", "approved", "rejected"];

const EDITABLE_FIELDS: { key: string; label: string; textarea?: boolean }[] = [
  { key: "display_name", label: "Display name" },
  { key: "slug", label: "Slug" },
  { key: "headline", label: "Headline" },
  { key: "bio", label: "Bio", textarea: true },
  { key: "city", label: "City" },
  { key: "region", label: "Region" },
  { key: "country", label: "Country" },
  { key: "website_url", label: "Website URL" },
  { key: "booking_url", label: "Booking URL" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "instagram_url", label: "Instagram URL" },
  { key: "youtube_url", label: "YouTube URL" },
  { key: "x_url", label: "X URL" },
  { key: "headshot_path", label: "Headshot path" },
];

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "submitted") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

export default function PractitionerDirectoryPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<string>("submitted");

  const selectedId = searchParams.get("practitioner");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["pd-admin-profiles", status],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("pd_admin_list_profiles", {
        p_status: status === "all" ? null : status,
      });
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  const selected = rows?.find((r) => r.user_id === selectedId) ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pd-admin-profiles"] });

  const openRow = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("practitioner", id);
    setSearchParams(next, { replace: false });
  };
  const closeRow = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("practitioner");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Practitioner Directory</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="pd-status" className="text-sm text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="pd-status" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Profiles</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : !rows?.length ? (
            <p className="text-sm text-muted-foreground">No profiles for this filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Listed</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.user_id}
                    className="cursor-pointer"
                    onClick={() => openRow(r.user_id)}
                  >
                    <TableCell className="font-medium">
                      {r.draft?.display_name || r.full_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.moderation_status)}>
                        {r.moderation_status ?? "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.listed ? "Yes" : "No"}</TableCell>
                    <TableCell>{fmt(r.submitted_at)}</TableCell>
                    <TableCell>{r.missing_fields?.length ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) closeRow(); }}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          {selected && (
            <DetailPanel row={selected} onChanged={async () => { await invalidate(); }} onDeleted={() => { closeRow(); invalidate(); }} toast={toast} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PayloadPanel({ title, payload }: { title: string; payload: Record<string, any> | null }) {
  const headshotUrl = payload?.headshot_path
    ? supabase.storage.from(PD_BUCKET).getPublicUrl(payload.headshot_path).data.publicUrl
    : null;
  return (
    <div className="rounded-md border p-4 space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {!payload ? (
        <p className="text-sm text-muted-foreground">Not currently live.</p>
      ) : (
        <div className="space-y-2 text-sm">
          {headshotUrl && (
            <img src={headshotUrl} alt={`${title} headshot`} className="h-20 w-20 rounded-full object-cover border" />
          )}
          {EDITABLE_FIELDS.map(({ key, label }) => (
            payload[key] ? (
              <div key={key}>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-foreground whitespace-pre-wrap break-words">{String(payload[key])}</div>
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  );
}

function DetailPanel({
  row, onChanged, onDeleted, toast,
}: {
  row: AdminRow;
  onChanged: () => Promise<void>;
  onDeleted: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [patch, setPatch] = useState<Record<string, string>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const { key } of EDITABLE_FIELDS) {
      init[key] = key === "slug" ? (row.slug ?? "") : (row.draft?.[key] ?? "") as string;
    }
    setPatch(init);
  }, [row.user_id]);

  const review = async (action: "approve" | "reject", p_note: string | null) => {
    setBusy(true);
    const { error } = await (supabase.rpc as any)("pd_admin_review_profile", {
      p_user_id: row.user_id, p_action: action, p_note,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    setRejectOpen(false);
    setNote("");
    await onChanged();
    toast({ title: action === "approve" ? "Profile approved" : "Profile rejected" });
  };

  const saveEdit = async () => {
    setBusy(true);
    const { error } = await (supabase.rpc as any)("pd_admin_update_profile", {
      p_user_id: row.user_id, p_patch: patch,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setEditOpen(false);
    await onChanged();
    toast({ title: "Profile updated" });
  };

  const doDelete = async () => {
    setBusy(true);
    const { error } = await (supabase.rpc as any)("pd_admin_delete_profile", { p_user_id: row.user_id });
    setBusy(false);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setDeleteOpen(false);
    onDeleted();
    toast({ title: "Profile deleted" });
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{row.draft?.display_name || row.full_name || row.email || "Practitioner"}</SheetTitle>
      </SheetHeader>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={statusVariant(row.moderation_status)}>{row.moderation_status ?? "draft"}</Badge>
          <span className="text-muted-foreground">{row.email}</span>
          <span className="text-muted-foreground">Listed: {row.listed ? "Yes" : "No"}</span>
        </div>
        {row.missing_fields?.length ? (
          <p className="text-sm text-muted-foreground">
            Missing fields: {row.missing_fields.join(", ")}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <PayloadPanel title="Submitted draft" payload={row.draft} />
          <PayloadPanel title="Currently live" payload={row.approved_payload} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => review("approve", null)}>Approve</Button>
          <Button variant="outline" disabled={busy} onClick={() => setRejectOpen(true)}>Reject</Button>
          <Button variant="outline" disabled={busy} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="destructive" disabled={busy} onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this profile</DialogTitle>
            <DialogDescription>
              The practitioner sees this note, so write it as feedback they can act on.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs to change before this can go live?" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button disabled={busy || note.trim().length === 0} onClick={() => review("reject", note.trim())}>
              Reject and send note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              {row.moderation_status === "approved"
                ? "This profile is already approved, so saving republishes it immediately."
                : "Your edits are saved to the practitioner's draft."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {EDITABLE_FIELDS.map(({ key, label, textarea }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`pd-admin-${key}`}>{label}</Label>
                {textarea ? (
                  <Textarea
                    id={`pd-admin-${key}`}
                    rows={6}
                    value={patch[key] ?? ""}
                    onChange={(e) => setPatch((p) => ({ ...p, [key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`pd-admin-${key}`}
                    value={patch[key] ?? ""}
                    onChange={(e) => setPatch((p) => ({ ...p, [key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this profile?</DialogTitle>
            <DialogDescription>
              This removes the profile content and takes it out of the directory. It does not withdraw the
              practitioner's consent to be listed — they can fill the profile in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
