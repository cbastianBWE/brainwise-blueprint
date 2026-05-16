import type { CompletionStatus } from "@/components/tile/tileVariants";

/**
 * Converts a string status (from RPC projections like assignment_status,
 * status_group, enrollment_status) into the CompletionStatus union used by
 * the Tile primitive.
 *
 * - "completed" or "certified" → "completed"
 * - "in_progress" → "in_progress"
 * - anything else (including null/undefined) → null (no status pill)
 */
export function enrolledStatusToCompletionStatus(
  status?: string | null,
): CompletionStatus {
  if (status === "completed" || status === "certified") return "completed";
  if (status === "in_progress") return "in_progress";
  return null;
}
