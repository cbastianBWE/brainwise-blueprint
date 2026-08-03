import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INVITE_TOKEN_KEY = "pending_invite_token";

export function stashInviteToken(token: string) {
  try { localStorage.setItem(INVITE_TOKEN_KEY, token); } catch { /* ignore */ }
}

export function readInviteToken(): string | null {
  try { return localStorage.getItem(INVITE_TOKEN_KEY); } catch { return null; }
}

export function clearInviteToken() {
  try { localStorage.removeItem(INVITE_TOKEN_KEY); } catch { /* ignore */ }
}

// Claims a single coach invitation for the currently-authenticated user against
// any stashed token. Safe to call more than once (RPC is idempotent). Returns
// true if the invitation was claimed or already held; false if there was nothing
// to do or the claim could not complete. Token is cleared on any terminal
// outcome so we never loop on a dead token.
export async function claimPendingCoachInvite(
  opts?: { silent?: boolean }
): Promise<boolean> {
  const token = readInviteToken();
  if (!token) return false;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return false;

  const { data, error } = await supabase.rpc(
    "coach_client_claim" as any,
    { p_token: token } as any
  );

  if (error) {
    const msg = error.message || "";
    if (/invite_not_found|invite_already_claimed|invite_revoked|invite_expired|coach_cannot_claim_own_invite/.test(msg)) {
      clearInviteToken();
      if (!opts?.silent) {
        if (/coach_cannot_claim_own_invite/.test(msg)) {
          toast.error("You can't claim your own invitation.");
        } else if (/already_claimed/.test(msg)) {
          toast.error("This invitation has already been claimed by someone else.");
        } else if (/revoked/.test(msg)) {
          toast.error("This invitation has been revoked by your practitioner.");
        } else if (/expired/.test(msg)) {
          toast.error("This invitation has expired. Ask your practitioner to resend it.");
        } else {
          toast.error("This invitation link is no longer valid.");
        }
      }
      return false;
    }
    return false;
  }

  clearInviteToken();
  const row = (data as any[])?.[0];
  if (!opts?.silent) {
    if (row?.out_duplicate_self_purchase) {
      toast.success(
        "Your practitioner-paid assessment is now on your account. Heads up: it looks like you already paid for this assessment yourself — contact your practitioner about a refund."
      );
    } else if (row?.out_already_claimed) {
      toast.success("This practitioner-paid assessment is already on your account.");
    } else if (row?.out_linked_existing_assessment) {
      toast.success("Your completed assessment is now linked to your practitioner.");
    } else {
      toast.success("Your practitioner-paid assessment has been added to your account.");
    }
  }
  return true;
}
