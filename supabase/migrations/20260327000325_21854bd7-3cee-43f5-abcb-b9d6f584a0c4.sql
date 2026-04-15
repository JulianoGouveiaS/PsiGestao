
CREATE TABLE public.package_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Pacote Mensal',
  total_sessions integer NOT NULL,
  session_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.package_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.package_templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own templates" ON public.package_templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own templates" ON public.package_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own templates" ON public.package_templates FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.packages ALTER COLUMN period_start DROP NOT NULL;
ALTER TABLE public.packages ALTER COLUMN period_end DROP NOT NULL;
