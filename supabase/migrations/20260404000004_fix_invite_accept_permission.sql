-- ===========================================================
-- FIX: Allow invited psychologist to read clinic info
-- so they can fetch owner_id when accepting an invite.
--
-- Uses a SECURITY DEFINER function to avoid the circular RLS
-- dependency between clinics ↔ clinic_invites policies.
-- ===========================================================

-- Helper: checks clinic_invites WITHOUT triggering its RLS policies
-- (SECURITY DEFINER bypasses RLS → breaks the recursion cycle)
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

-- Uses the helper instead of a direct subquery to prevent recursion
CREATE POLICY "Invited users can view clinic info"
  ON public.clinics FOR SELECT
  USING (public.has_pending_invite_for_clinic(id));
