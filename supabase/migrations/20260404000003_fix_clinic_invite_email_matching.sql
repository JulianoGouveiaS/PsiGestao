-- ============================================================
-- FIX CLINIC INVITE EMAIL MATCHING
-- Invites are created with invited_email but no invited_user_id
-- (because we can't look up auth.users from the client).
-- This migration:
--   1. Adds a SECURITY DEFINER helper to read the current user's email
--   2. Adds a trigger to auto-resolve email → user_id on insert
--   3. Widens the RLS SELECT/UPDATE policies to also match by email
-- ============================================================

-- 1. Helper function: read current user's email (needed in RLS – direct
--    auth.users access is blocked inside policy expressions).
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- 2. Trigger function: auto-populate invited_user_id when invite is inserted
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

-- 3. Drop the old narrow policies and replace with email-aware ones

DROP POLICY IF EXISTS "Invited psychologist views invite"      ON public.clinic_invites;
DROP POLICY IF EXISTS "Invited psychologist responds to invite" ON public.clinic_invites;

-- Allow SELECT if invited_user_id matches (already-resolved) OR email matches
CREATE POLICY "Invited psychologist views invite"
  ON public.clinic_invites FOR SELECT
  USING (
    invited_user_id = auth.uid()
    OR invited_email = public.get_my_email()
  );

-- Allow UPDATE (accept / reject) under the same conditions
CREATE POLICY "Invited psychologist responds to invite"
  ON public.clinic_invites FOR UPDATE
  USING (
    invited_user_id = auth.uid()
    OR invited_email = public.get_my_email()
  );

