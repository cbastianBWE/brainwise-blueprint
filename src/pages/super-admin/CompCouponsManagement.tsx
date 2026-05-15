import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Ticket, Plus, Archive, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "individual", label: "Individual" },
  { value: "coach", label: "Coach" },
  { value: "corporate_employee", label: "Corporate Employee" },
  { value: "company_admin", label: "Company Admin" },
  { value: "org_admin", label: "Org Admin" },
  { value: "brainwise_super_admin", label: "Super Admin" },
];

const DURATION_OPTIONS = [
  { value: "once", label: "Once (single use per customer)" },
  { value: "repeating", label: "Repeating (N billing cycles)" },
  { value: "forever", label: "Forever (perpetual discount)" },
];

interface CompCouponRow {
  id: string;
  stripe_coupon_id: string;
  internal_name: string;
  description: string | null;
  percent_off: number;
  duration: "once" | "repeating" | "forever";
  duration_in_months: number | null;
  max_redemptions: number | null;
  redeem_by: string;
  applicable_account_types: string[] | null;
  applicable_instrument_ids: string[] | null;
  created_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  notes: string | null;
}

export default function CompCouponsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState<CompCouponRow | null>(null);

  const { data: coupons, isLoading, error } = useQuery({
    queryKey: ["comp-coupons", showArchived],
    queryFn: async (): Promise<CompCouponRow[]> => {
      let query = (supabase as any)
        .from("comp_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (!showArchived) query = query.is("archived_at", null);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CompCouponRow[];
    },
    staleTime: 10_000,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#021F36] flex items-center gap-2">
            <Ticket className="h-7 w-7" />
            Comp Coupons
          </h1>
          <p className="text-muted-foreground mt-1">
            Stripe coupons for waiving assessment costs or running promotions. Every coupon expires.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shadow-cta">
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        <Label htmlFor="show-archived" className="cursor-pointer">
          Show archived coupons
        </Label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{showArchived ? "All Coupons" : "Active Coupons"}</CardTitle>
          <CardDescription>
            {coupons?.length ?? 0} coupon{coupons?.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {error && (
            <div className="text-destructive text-sm py-4">
              Error loading coupons: {(error as Error).message}
            </div>
          )}

          {!isLoading && !error && coupons && coupons.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No {showArchived ? "" : "active "}coupons yet.</p>
              <p className="text-sm">Click "Create Coupon" to make one.</p>
            </div>
          )}

          {!isLoading && !error && coupons && coupons.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>% Off</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const isArchived = coupon.archived_at !== null;
                  const isExpired = !isArchived && new Date(coupon.redeem_by) < new Date();
                  const daysUntilExpiry = Math.ceil(
                    (new Date(coupon.redeem_by).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                  );
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="font-medium">{coupon.internal_name}</div>
                        {coupon.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
                            {coupon.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{coupon.percent_off}%</TableCell>
                      <TableCell className="text-sm">
                        {coupon.duration === "once" && "Once"}
                        {coupon.duration === "repeating" && `${coupon.duration_in_months} mo`}
                        {coupon.duration === "forever" && "Forever"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {coupon.applicable_account_types === null ? (
                          <span className="text-muted-foreground">All account types</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {coupon.applicable_account_types.map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">
                                {ACCOUNT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{coupon.stripe_coupon_id}</TableCell>
                      <TableCell className="text-xs">
                        {isExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          <span>
                            {daysUntilExpiry}d ({new Date(coupon.redeem_by).toLocaleDateString()})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isArchived ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : isExpired ? (
                          <Badge variant="outline">Expired</Badge>
                        ) : (
                          <Badge style={{ background: "#2D6A4F", color: "white" }}>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isArchived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveOpen(coupon)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Archive className="h-3.5 w-3.5 mr-1" />
                            Archive
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateCouponModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["comp-coupons"] });
          toast({
            title: "Coupon created",
            description: "Stripe coupon is live and applicable to matching orders.",
          });
        }}
      />

      <ArchiveCouponModal
        coupon={archiveOpen}
        onOpenChange={(open) => !open && setArchiveOpen(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["comp-coupons"] });
          toast({
            title: "Coupon archived",
            description: "Coupon will no longer auto-apply to new orders.",
          });
        }}
      />
    </div>
  );
}

function CreateCouponModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [internalName, setInternalName] = useState("");
  const [description, setDescription] = useState("");
  const [percentOff, setPercentOff] = useState(100);
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">("once");
  const [durationInMonths, setDurationInMonths] = useState<string | number>("");
  const [maxRedemptions, setMaxRedemptions] = useState<string | number>("");
  const [redeemByDays, setRedeemByDays] = useState(60);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>(["brainwise_super_admin"]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setInternalName("");
    setDescription("");
    setPercentOff(100);
    setDuration("once");
    setDurationInMonths("");
    setMaxRedemptions("");
    setRedeemByDays(60);
    setSelectedAccountTypes(["brainwise_super_admin"]);
    setReason("");
    setNotes("");
    setConfirmOpen(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!internalName.trim()) return "Name is required";
    if (percentOff < 1 || percentOff > 100) return "Percent off must be 1-100";
    if (duration === "repeating" && (!durationInMonths || Number(durationInMonths) <= 0)) {
      return "Duration in months required for repeating coupons";
    }
    if (reason.trim().length < 10) return "Reason must be at least 10 characters";
    return null;
  };

  const handleRequestSubmit = () => {
    const err = validateForm();
    if (err) {
      toast({ variant: "destructive", title: "Form error", description: err });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setConfirmOpen(false);
    const redeemByIso = new Date(Date.now() + redeemByDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      const { error } = await supabase.functions.invoke("create-comp-coupon", {
        body: {
          internal_name: internalName.trim(),
          description: description.trim() || null,
          percent_off: percentOff,
          duration,
          duration_in_months: duration === "repeating" ? Number(durationInMonths) : null,
          max_redemptions: maxRedemptions === "" ? null : Number(maxRedemptions),
          redeem_by_iso: redeemByIso,
          applicable_account_types: selectedAccountTypes.length > 0 ? selectedAccountTypes : null,
          applicable_instrument_ids: null,
          reason: reason.trim(),
          notes: notes.trim() || null,
        },
      });
      if (error) {
        const errorMsg = (error as any)?.context?.body?.error || error.message || "Unknown error";
        toast({ variant: "destructive", title: "Create failed", description: errorMsg });
        setSubmitting(false);
        return;
      }
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Create failed", description: msg });
      setSubmitting(false);
    }
  };

  const toggleAccountType = (type: string) => {
    setSelectedAccountTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Comp Coupon</DialogTitle>
            <DialogDescription>
              Creates a coupon on Stripe and registers it in BrainWise. The coupon
              auto-applies to matching orders via the checkout flow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internal-name">Internal name *</Label>
              <Input
                id="internal-name"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                placeholder="e.g. super_admin_comp, early_bird_2026, partner_acme"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Used to identify the coupon in BrainWise. Stripe gets a separate auto-generated ID.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of what this coupon is for."
                rows={2}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="percent-off">Percent off *</Label>
                <Input
                  id="percent-off"
                  type="number"
                  min={1}
                  max={100}
                  value={percentOff}
                  onChange={(e) => setPercentOff(Number(e.target.value))}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redeem-by">Expires in (days)</Label>
                <Input
                  id="redeem-by"
                  type="number"
                  min={1}
                  value={redeemByDays}
                  onChange={(e) => setRedeemByDays(Number(e.target.value))}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">Default 60. Every coupon expires.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Select
                value={duration}
                onValueChange={(v) => setDuration(v as any)}
                disabled={submitting}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {duration === "repeating" && (
              <div className="space-y-2">
                <Label htmlFor="duration-months">Duration in months *</Label>
                <Input
                  id="duration-months"
                  type="number"
                  min={1}
                  value={durationInMonths}
                  onChange={(e) =>
                    setDurationInMonths(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  disabled={submitting}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="max-redemptions">Max redemptions</Label>
              <Input
                id="max-redemptions"
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(e) =>
                  setMaxRedemptions(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Leave empty for unlimited"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label>Applicable account types</Label>
              <p className="text-xs text-muted-foreground">
                Select which account types can use this coupon. Empty = any account type.
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={selectedAccountTypes.includes(opt.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => !submitting && toggleAccountType(opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason * (min 10 chars, audited)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this coupon being created? Logged in the audit trail."
                rows={2}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for internal reference."
                rows={2}
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleRequestSubmit} disabled={submitting} className="shadow-cta">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Coupon"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm coupon creation
            </DialogTitle>
            <DialogDescription>
              You are about to create a Stripe coupon on the LIVE Stripe account.
              This coupon will start auto-applying to matching orders immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 p-4 rounded-md text-sm space-y-2">
            <div><span className="font-medium">Name:</span> {internalName}</div>
            <div><span className="font-medium">Discount:</span> {percentOff}% off</div>
            <div>
              <span className="font-medium">Duration:</span> {duration}
              {duration === "repeating" && ` (${durationInMonths} months)`}
            </div>
            <div><span className="font-medium">Expires:</span> {redeemByDays} days from now</div>
            <div>
              <span className="font-medium">Applies to:</span>{" "}
              {selectedAccountTypes.length === 0
                ? "All account types"
                : selectedAccountTypes
                    .map((t) => ACCOUNT_TYPE_OPTIONS.find((o) => o.value === t)?.label)
                    .join(", ")}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Back to edit
            </Button>
            <Button onClick={handleConfirmSubmit} className="shadow-cta">
              <CheckCircle className="h-4 w-4 mr-2" />
              Yes, create coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ArchiveCouponModal({
  coupon,
  onOpenChange,
  onSuccess,
}: {
  coupon: CompCouponRow | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!coupon) return null;

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    setSubmitting(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      toast({ variant: "destructive", title: "Reason required", description: "Min 10 characters." });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).rpc("archive_comp_coupon", {
        p_coupon_id: coupon.id,
        p_reason: reason.trim(),
      });
      if (error) {
        toast({ variant: "destructive", title: "Archive failed", description: error.message });
        setSubmitting(false);
        return;
      }
      setReason("");
      setSubmitting(false);
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Archive failed", description: msg });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={coupon !== null} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Archive coupon</DialogTitle>
          <DialogDescription>
            Soft-deletes this coupon in BrainWise. Stripe-side coupon is NOT deleted —
            you can re-enable later via Stripe Dashboard if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-md text-sm">
          <div className="font-medium">{coupon.internal_name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {coupon.percent_off}% off · Stripe ID {coupon.stripe_coupon_id}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="archive-reason">Reason * (min 10 chars, audited)</Label>
          <Textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you archiving this coupon?"
            rows={3}
            disabled={submitting}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Archiving...
              </>
            ) : (
              "Archive coupon"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
