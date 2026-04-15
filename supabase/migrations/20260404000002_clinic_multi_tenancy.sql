-- ============================================================
-- CLINIC MULTI-TENANCY
-- Adds clinic admin account type + invite/member management
-- ============================================================

-- 1. Add role to existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'psychologist'
    CHECK (role IN ('psychologist', 'clinic_admin'));

-- Update trigger to capture role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'psychologist')
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

-- 2. Clinics table
CREATE TABLE public.clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id)  -- one clinic per admin account
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owner full access"
  ON public.clinics FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Members can view their clinic"
  ON public.clinics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE clinic_id = clinics.id
        AND psychologist_user_id = auth.uid()
        AND active = TRUE
    )
  );

-- 3. Clinic invites table
CREATE TABLE public.clinic_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  invited_email   TEXT NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected')),
  permissions     JSONB NOT NULL DEFAULT '{
    "view_agenda": true,
    "manage_sessions": true,
    "view_patients": true,
    "view_finances": true
  }',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  UNIQUE (clinic_id, invited_email)
);

ALTER TABLE public.clinic_invites ENABLE ROW LEVEL SECURITY;

-- Clinic owner can manage all invites for their clinic
CREATE POLICY "Clinic owner manages invites"
  ON public.clinic_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_invites.clinic_id
        AND owner_id = auth.uid()
    )
  );

-- Invited psychologist can view and respond to their own invite
CREATE POLICY "Invited psychologist views invite"
  ON public.clinic_invites FOR SELECT
  USING (invited_user_id = auth.uid());

CREATE POLICY "Invited psychologist responds to invite"
  ON public.clinic_invites FOR UPDATE
  USING (invited_user_id = auth.uid());

-- 4. Clinic members table (active relationships after invite accepted)
CREATE TABLE public.clinic_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  admin_user_id         UUID NOT NULL REFERENCES auth.users(id),
  psychologist_user_id  UUID NOT NULL REFERENCES auth.users(id),
  permissions           JSONB NOT NULL DEFAULT '{
    "view_agenda": true,
    "manage_sessions": true,
    "view_patients": true,
    "view_finances": true
  }',
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, psychologist_user_id)
);

ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- Clinic admin can manage members
CREATE POLICY "Clinic admin manages members"
  ON public.clinic_members FOR ALL
  USING (admin_user_id = auth.uid());

-- Psychologist can view their own memberships
CREATE POLICY "Psychologist views own memberships"
  ON public.clinic_members FOR SELECT
  USING (psychologist_user_id = auth.uid());

-- Psychologist can update their own permissions / deactivate
CREATE POLICY "Psychologist updates own membership"
  ON public.clinic_members FOR UPDATE
  USING (psychologist_user_id = auth.uid());

-- 5. Helper function: does auth.uid() manage target user?
CREATE OR REPLACE FUNCTION public.is_clinic_admin_for(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members
    WHERE admin_user_id        = auth.uid()
      AND psychologist_user_id = target_user_id
      AND active               = TRUE
  );
$$;

-- Allow clinic admins to see profile info of managed psychologists
CREATE POLICY "Clinic admin views psychologist profiles"
  ON public.profiles FOR SELECT
  USING (is_clinic_admin_for(id));

-- Allow psychologists to see profiles of their clinic admins
CREATE POLICY "Psychologist views clinic admin profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE psychologist_user_id = auth.uid()
        AND admin_user_id        = profiles.id
        AND active               = TRUE
    )
  );

-- 6. Widen RLS on all core tables to include clinic admin access
--    Pattern: user_id = auth.uid() OR is_clinic_admin_for(user_id)

-- sessions
DROP POLICY IF EXISTS "Users can view own sessions"   ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- patients
DROP POLICY IF EXISTS "Users can view own patients"   ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;

CREATE POLICY "Users can view own patients"
  ON public.patients FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own patients"
  ON public.patients FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can update own patients"
  ON public.patients FOR UPDATE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can delete own patients"
  ON public.patients FOR DELETE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- payments
DROP POLICY IF EXISTS "Users can view own payments"   ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can update own payments"
  ON public.payments FOR UPDATE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can delete own payments"
  ON public.payments FOR DELETE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- packages
DROP POLICY IF EXISTS "Users can view own packages"   ON public.packages;
DROP POLICY IF EXISTS "Users can insert own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can update own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can delete own packages" ON public.packages;

CREATE POLICY "Users can view own packages"
  ON public.packages FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own packages"
  ON public.packages FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can update own packages"
  ON public.packages FOR UPDATE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can delete own packages"
  ON public.packages FOR DELETE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- session_notes
DROP POLICY IF EXISTS "Users can view own session_notes"   ON public.session_notes;
DROP POLICY IF EXISTS "Users can insert own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can update own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can delete own session_notes" ON public.session_notes;

CREATE POLICY "Users can view own session_notes"
  ON public.session_notes FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own session_notes"
  ON public.session_notes FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can update own session_notes"
  ON public.session_notes FOR UPDATE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can delete own session_notes"
  ON public.session_notes FOR DELETE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- anamnesis
DROP POLICY IF EXISTS "Users can view own anamnesis"   ON public.anamnesis;
DROP POLICY IF EXISTS "Users can insert own anamnesis" ON public.anamnesis;
DROP POLICY IF EXISTS "Users can update own anamnesis" ON public.anamnesis;
DROP POLICY IF EXISTS "Users can delete own anamnesis" ON public.anamnesis;

CREATE POLICY "Users can view own anamnesis"
  ON public.anamnesis FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own anamnesis"
  ON public.anamnesis FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can update own anamnesis"
  ON public.anamnesis FOR UPDATE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- professional_settings (view only for admin - they can't change psych's settings)
DROP POLICY IF EXISTS "Users can view own settings" ON public.professional_settings;

CREATE POLICY "Users can view own settings"
  ON public.professional_settings FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- waitlist
DROP POLICY IF EXISTS "Users can view own waitlist"   ON public.waitlist;
DROP POLICY IF EXISTS "Users can insert own waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Users can update own waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Users can delete own waitlist" ON public.waitlist;

CREATE POLICY "Users can view own waitlist"
  ON public.waitlist FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can update own waitlist"
  ON public.waitlist FOR UPDATE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can delete own waitlist"
  ON public.waitlist FOR DELETE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- session_note_attachments
DROP POLICY IF EXISTS "Users can view own attachments"   ON public.session_note_attachments;
DROP POLICY IF EXISTS "Users can insert own attachments" ON public.session_note_attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.session_note_attachments;

CREATE POLICY "Users can view own attachments"
  ON public.session_note_attachments FOR SELECT
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can insert own attachments"
  ON public.session_note_attachments FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE POLICY "Users can delete own attachments"
  ON public.session_note_attachments FOR DELETE
  USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

-- Indexes for performance
CREATE INDEX idx_clinic_members_admin_user_id       ON public.clinic_members(admin_user_id);
CREATE INDEX idx_clinic_members_psychologist_user_id ON public.clinic_members(psychologist_user_id);
CREATE INDEX idx_clinic_invites_clinic_id            ON public.clinic_invites(clinic_id);
CREATE INDEX idx_clinic_invites_invited_user_id      ON public.clinic_invites(invited_user_id);

