import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BULK_TOKEN_KEY = "pending_bulk_token";

export function stashBulkToken(token: string) {
  try { localStorage.setItem(BULK_TOKEN_KEY, token); } catch { /* ignore */ }
}

export function readBulkToken(): string | null {
  try { return localStorage.getItem(BULK_TOKEN_KEY); } catch { return null; }
}

export function clearBulkToken() {
  try { localStorage.removeItem(BULK_TOKEN_KEY); } catch { /* ignore */ }
}

// Attempts to claim a seat for the currently-authenticated user against any
// stashed bulk-link token. Safe to call more than once (the RPC is idempotent).
// Returns true if a seat was claimed or was already held; false if there was
// nothing to do or the claim could not be completed (token is cleared on any
// terminal outcome so we never loop on a dead token).
export async function claimPendingBulkSeat(opts?: { silent?: boolean }): Promise<boolean> {
  const token = readBulkToken();
  if (!token) return false;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return false;

  const { data, error } = await supabase.rpc("coach_bulk_link_claim" as any, { p_token: token } as any);

  if (error) {
    const msg = error.message || "";
    if (/link_not_found|link_expired|link_exhausted|link_not_active|coach_cannot_claim_own_link/.test(msg)) {
      clearBulkToken();
      if (!opts?.silent) {
        if (/coach_cannot_claim_own_link/.test(msg)) {
          toast.error("You can't claim a seat on your own link.");
        } else if (/exhausted/.test(msg)) {
          toast.error("This assessment link is full — all seats have been claimed.");
        } else if (/expired/.test(msg)) {
          toast.error("This assessment link has expired.");
        } else if (/not_active/.test(msg)) {
          toast.error("This assessment link isn't active yet. Try again shortly.");
        } else {
          toast.error("This assessment link is no longer valid.");
        }
      }
      return false;
    }
    return false;
  }

  clearBulkToken();
  const row = (data as any[])?.[0];
  if (!opts?.silent) {
    toast.success(row?.already_claimed
      ? "Your coach-paid assessment is already on your account."
      : "Your coach-paid assessment has been added to your account.");
  }
  return true;
}
