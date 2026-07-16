import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const NAVY = "#021F36";
const TEAL = "#006D77";
const MUTED = "#6D6875";

export interface LeadershipItem {
  headline: string;
  detail: string;
  action?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LeadershipItem[];
  /** Optional name substitution (paired reports pass nm). */
  transform?: (s: string) => string;
}

/**
 * Leader-facing snapshot modal. The three things whoever leads this team/pair
 * most needs to know, each with one concrete move. Visibility of the underlying
 * data is enforced server-side (restrictive RLS via bw_can_see_leadership_content),
 * so this component simply renders whatever items it is given.
 */
export default function LeadershipModal({ open, onOpenChange, items, transform }: Props) {
  const t = (s: string) => (transform ? transform(s ?? "") : s ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>For the leader</DialogTitle>
          <DialogDescription>
            The three things whoever leads this group most needs to know, and one move for each.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {(items ?? []).slice(0, 3).map((it, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 12 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ color: TEAL, fontWeight: 700 }}>{i + 1}.</span>
                <span style={{ color: NAVY, fontWeight: 700, fontSize: 16 }}>{t(it.headline)}</span>
              </div>
              <p style={{ margin: "6px 0 0", color: NAVY, lineHeight: 1.55, fontSize: 14 }}>
                {t(it.detail)}
              </p>
              {it.action && (
                <div style={{ marginTop: 8, color: TEAL, fontWeight: 600, fontSize: 14 }}>
                  {t(it.action)}
                </div>
              )}
            </div>
          ))}
          <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
            Shared with leaders and administrators under the participants' sharing settings.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
