
CREATE TYPE public.patient_status AS ENUM ('active', 'inactive');
CREATE TYPE public.session_status AS ENUM ('scheduled', 'completed', 'missed', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('paid', 'partial', 'pending');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  status public.patient_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status public.session_status NOT NULL DEFAULT 'scheduled',
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sessions_price_non_negative CHECK (price >= 0)
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT payments_total_amount_non_negative CHECK (total_amount >= 0),
  CONSTRAINT payments_amount_paid_lte_total CHECK (amount_paid <= total_amount)
);

CREATE TABLE public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.anamnesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_user_id ON public.patients(user_id);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_patient_id ON public.sessions(patient_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_session_id ON public.payments(session_id);
CREATE INDEX idx_session_notes_session_id ON public.session_notes(session_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (id = auth.uid());

CREATE POLICY "Users can view own patients" ON public.patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own patients" ON public.patients FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own patients" ON public.patients FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own patients" ON public.patients FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view own session_notes" ON public.session_notes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own session_notes" ON public.session_notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own session_notes" ON public.session_notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own session_notes" ON public.session_notes FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view own anamnesis" ON public.anamnesis FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own anamnesis" ON public.anamnesis FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own anamnesis" ON public.anamnesis FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own anamnesis" ON public.anamnesis FOR DELETE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
