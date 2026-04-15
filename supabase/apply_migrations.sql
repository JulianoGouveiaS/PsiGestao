-- ===========================================================
-- EXECUTE ESTE ARQUIVO NO SQL EDITOR DO SUPABASE DASHBOARD
-- https://app.supabase.com/project/juaqhrrjikktdmiygqqr/sql/new
-- ===========================================================

-- ============================================================
-- MIGRATION 1: CLINIC MULTI-TENANCY
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

-- 2. Clinics table (NO cross-table policy yet — added after clinic_members exists)
CREATE TABLE IF NOT EXISTS public.clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic owner full access"      ON public.clinics;
DROP POLICY IF EXISTS "Members can view their clinic" ON public.clinics;

CREATE POLICY "Clinic owner full access"
  ON public.clinics FOR ALL
  USING (owner_id = auth.uid());

-- 3. Clinic members table (must exist before the cross-table policy on clinics)
CREATE TABLE IF NOT EXISTS public.clinic_members (
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

DROP POLICY IF EXISTS "Clinic admin manages members"        ON public.clinic_members;
DROP POLICY IF EXISTS "Psychologist views own memberships"  ON public.clinic_members;
DROP POLICY IF EXISTS "Psychologist updates own membership" ON public.clinic_members;

CREATE POLICY "Clinic admin manages members"
  ON public.clinic_members FOR ALL
  USING (admin_user_id = auth.uid());

CREATE POLICY "Psychologist views own memberships"
  ON public.clinic_members FOR SELECT
  USING (psychologist_user_id = auth.uid());

CREATE POLICY "Psychologist updates own membership"
  ON public.clinic_members FOR UPDATE
  USING (psychologist_user_id = auth.uid());

-- Allows a psychologist to INSERT their own membership row when accepting an invite.
-- The existing ALL policy only covers the admin side (admin_user_id = auth.uid()).
DROP POLICY IF EXISTS "Psychologist can accept invite" ON public.clinic_members;
CREATE POLICY "Psychologist can accept invite"
  ON public.clinic_members FOR INSERT
  WITH CHECK (
    psychologist_user_id = auth.uid()
    AND public.has_pending_invite_for_clinic(clinic_id)
  );

-- Now safe to add the cross-table policy on clinics
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

-- Allow a psychologist with a PENDING invite to read clinic info
-- (needed so they can fetch owner_id when accepting the invite).
-- Uses a SECURITY DEFINER helper to avoid circular RLS recursion
-- between clinics ↔ clinic_invites policies.
CREATE OR REPLACE FUNCTION public.has_pending_invite_for_clinic(p_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_invites
    WHERE clinic_id    = p_clinic_id
      AND invited_email = public.get_my_email()
      AND status        = 'pending'
  );
$$;

DROP POLICY IF EXISTS "Invited users can view clinic info" ON public.clinics;
CREATE POLICY "Invited users can view clinic info"
  ON public.clinics FOR SELECT
  USING (public.has_pending_invite_for_clinic(id));

-- 4. Clinic invites table
CREATE TABLE IF NOT EXISTS public.clinic_invites (
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

DROP POLICY IF EXISTS "Clinic owner manages invites"            ON public.clinic_invites;
DROP POLICY IF EXISTS "Invited psychologist views invite"       ON public.clinic_invites;
DROP POLICY IF EXISTS "Invited psychologist responds to invite" ON public.clinic_invites;

CREATE POLICY "Clinic owner manages invites"
  ON public.clinic_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_invites.clinic_id
        AND owner_id = auth.uid()
    )
  );

-- 5. Helper function
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

-- Profile visibility for clinic relationships
DROP POLICY IF EXISTS "Clinic admin views psychologist profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Psychologist views clinic admin profiles"  ON public.profiles;

CREATE POLICY "Clinic admin views psychologist profiles"
  ON public.profiles FOR SELECT
  USING (is_clinic_admin_for(id));

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

-- 6. Widen RLS on core tables

DROP POLICY IF EXISTS "Users can view own sessions"   ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions"   ON public.sessions FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own patients"   ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;
CREATE POLICY "Users can view own patients"   ON public.patients FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own patients" ON public.patients FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can update own patients" ON public.patients FOR UPDATE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can delete own patients" ON public.patients FOR DELETE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own payments"   ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;
CREATE POLICY "Users can view own payments"   ON public.payments FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own packages"   ON public.packages;
DROP POLICY IF EXISTS "Users can insert own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can update own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can delete own packages" ON public.packages;
CREATE POLICY "Users can view own packages"   ON public.packages FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own packages" ON public.packages FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can update own packages" ON public.packages FOR UPDATE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can delete own packages" ON public.packages FOR DELETE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own session_notes"   ON public.session_notes;
DROP POLICY IF EXISTS "Users can insert own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can update own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can delete own session_notes" ON public.session_notes;
CREATE POLICY "Users can view own session_notes"   ON public.session_notes FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own session_notes" ON public.session_notes FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can update own session_notes" ON public.session_notes FOR UPDATE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can delete own session_notes" ON public.session_notes FOR DELETE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own anamnesis"   ON public.anamnesis;
DROP POLICY IF EXISTS "Users can insert own anamnesis" ON public.anamnesis;
DROP POLICY IF EXISTS "Users can update own anamnesis" ON public.anamnesis;
DROP POLICY IF EXISTS "Users can delete own anamnesis" ON public.anamnesis;
CREATE POLICY "Users can view own anamnesis"   ON public.anamnesis FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own anamnesis" ON public.anamnesis FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can update own anamnesis" ON public.anamnesis FOR UPDATE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own settings" ON public.professional_settings;
CREATE POLICY "Users can view own settings" ON public.professional_settings FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own waitlist"   ON public.waitlist;
DROP POLICY IF EXISTS "Users can insert own waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Users can update own waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Users can delete own waitlist" ON public.waitlist;
CREATE POLICY "Users can view own waitlist"   ON public.waitlist FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own waitlist" ON public.waitlist FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can update own waitlist" ON public.waitlist FOR UPDATE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can delete own waitlist" ON public.waitlist FOR DELETE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

DROP POLICY IF EXISTS "Users can view own attachments"   ON public.session_note_attachments;
DROP POLICY IF EXISTS "Users can insert own attachments" ON public.session_note_attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.session_note_attachments;
CREATE POLICY "Users can view own attachments"   ON public.session_note_attachments FOR SELECT USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can insert own attachments" ON public.session_note_attachments FOR INSERT WITH CHECK (user_id = auth.uid() OR is_clinic_admin_for(user_id));
CREATE POLICY "Users can delete own attachments" ON public.session_note_attachments FOR DELETE USING (user_id = auth.uid() OR is_clinic_admin_for(user_id));

CREATE INDEX IF NOT EXISTS idx_clinic_members_admin_user_id        ON public.clinic_members(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_psychologist_user_id ON public.clinic_members(psychologist_user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invites_clinic_id             ON public.clinic_invites(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invites_invited_user_id       ON public.clinic_invites(invited_user_id);

-- ============================================================
-- MIGRATION 2: FIX CLINIC INVITE EMAIL MATCHING
-- ============================================================

-- Helper: returns the email of the currently authenticated user.
-- Must be SECURITY DEFINER so it can read auth.users from inside RLS policies.
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.resolve_invite_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = NEW.invited_email
  LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    NEW.invited_user_id := v_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinic_invite_resolve_user_id ON public.clinic_invites;
CREATE TRIGGER clinic_invite_resolve_user_id
  BEFORE INSERT ON public.clinic_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_invite_user_id();

-- Use get_my_email() instead of a bare subquery on auth.users —
-- direct auth.users access is blocked inside policy expressions.
CREATE POLICY "Invited psychologist views invite"
  ON public.clinic_invites FOR SELECT
  USING (
    invited_user_id = auth.uid()
    OR invited_email = public.get_my_email()
  );

CREATE POLICY "Invited psychologist responds to invite"
  ON public.clinic_invites FOR UPDATE
  USING (
    invited_user_id = auth.uid()
    OR invited_email = public.get_my_email()
  );

-- ============================================================
-- FIX EXISTING ACCOUNTS
-- Re-syncs the role column for ALL existing users from their
-- signup metadata so the secretaria account gets 'clinic_admin'.
-- ============================================================
UPDATE public.profiles p
SET role = COALESCE(u.raw_user_meta_data ->> 'role', 'psychologist')
FROM auth.users u
WHERE p.id = u.id;


