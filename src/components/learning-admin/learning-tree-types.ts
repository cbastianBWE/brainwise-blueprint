export type MarkTier = "content_item" | "module" | "curriculum" | "cert_path";

export interface MarkTarget {
  tier: MarkTier;
  entityName: string;
  contentItemId?: string;
  moduleId?: string;
  assignmentId?: string;
  certificationId?: string;
  /** user_id for the three set_*_completion RPCs. Cert path uses certificationId alone. */
  userId: string;
  /** For cert path: true = grant, false = revoke. */
  complete: boolean;
}
