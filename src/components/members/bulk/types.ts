export type BulkAssignType = "cert_path" | "curriculum" | "module";

export interface BulkResult {
  operation?: string;
  requested?: number;
  succeeded?: number;
  failed?: number;
  results?: Array<{
    user_id?: string;
    status?: string;
    detail?: string;
    [k: string]: unknown;
  }>;
}

export interface BulkChunkResult {
  succeeded: number;
  failed: number;
  results: Array<{ user_id?: string; status?: string; detail?: string }>;
}

export interface ImportReference {
  certification_paths: { id: string; name: string }[];
  curricula: { id: string; name: string }[];
  modules: { id: string; name: string }[];
  mentors: { user_id: string; full_name: string | null; email: string | null }[];
}

export interface ImportRowResult {
  row_number: number;
  status: string;
  message?: string;
  [k: string]: unknown;
}

export interface ImportResult {
  total: number;
  succeeded: number;
  failed: number;
  rows: ImportRowResult[];
}

export interface MentorableCert {
  certification_id: string;
  certification_type: string;
  status: string;
}

export interface MentorResolution {
  trainee_user_id: string;
  trainee_label: string;
  loading: boolean;
  certifications: MentorableCert[];
  selectedCertId: string | null;
  error: string | null;
}

export interface ScheduledAssignment {
  id: string;
  assignment_type: "curriculum" | "module" | "cert_path" | "mentor";
  target_id: string;
  user_ids: string[];
  user_count: number;
  scheduled_for: string;
  scheduled_by: string;
  scheduled_by_name: string;
  reason: string;
  mentor_certification_id: string | null;
  status: "pending" | "processing" | "completed" | "partial" | "failed" | "cancelled";
  result: unknown;
  failure_summary: string | null;
  created_at: string;
  processed_at: string | null;
}
