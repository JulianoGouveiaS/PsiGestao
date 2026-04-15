
CREATE TABLE public.professional_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  default_session_price numeric NOT NULL DEFAULT 150,
  session_duration_minutes integer NOT NULL DEFAULT 50,
  calendar_start_hour integer NOT NULL DEFAULT 7,
  calendar_end_hour integer NOT NULL DEFAULT 22,
  lunch_start time DEFAULT '12:00',
  lunch_end time DEFAULT '13:00',
  working_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.professional_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own settings" ON public.professional_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own settings" ON public.professional_settings FOR UPDATE USING (user_id = auth.uid());
