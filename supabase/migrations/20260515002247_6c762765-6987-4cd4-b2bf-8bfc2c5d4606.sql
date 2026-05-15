ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS narrative_status text,
  ADD COLUMN IF NOT EXISTS narrative_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS narrative_completed_at timestamptz;