
CREATE TABLE public.assessment_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instrument_id text NOT NULL,
  amount_paid numeric NOT NULL,
  stripe_payment_intent_id text,
  stripe_session_id text,
  purchased_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessment_purchases: users read their own"
  ON public.assessment_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "assessment_purchases: super admin can read all"
  ON public.assessment_purchases FOR SELECT
  TO authenticated
  USING (public.current_user_account_type() = 'brainwise_super_admin');

CREATE POLICY "assessment_purchases: service_role full access"
  ON public.assessment_purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
