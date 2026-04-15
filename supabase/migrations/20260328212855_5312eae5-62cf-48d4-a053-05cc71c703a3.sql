
CREATE TYPE public.waitlist_status AS ENUM ('waiting', 'scheduled', 'cancelled');

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  preferred_day smallint NOT NULL CHECK (preferred_day BETWEEN 0 AND 6),
  preferred_time time,
  notes text,
  status waitlist_status NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waitlist" ON public.waitlist FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own waitlist" ON public.waitlist FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own waitlist" ON public.waitlist FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own waitlist" ON public.waitlist FOR DELETE USING (user_id = auth.uid());
