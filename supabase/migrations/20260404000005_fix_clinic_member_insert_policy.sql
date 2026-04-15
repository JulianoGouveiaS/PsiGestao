-- ===========================================================
-- FIX: Allow psychologist to INSERT their own clinic_members
-- row when accepting a pending clinic invite.
-- ===========================================================

-- The existing INSERT policy only allows the clinic admin.
-- A psychologist also needs INSERT permission on the row that
-- represents their own membership, but only when they have a
-- valid pending invite for that clinic.

DROP POLICY IF EXISTS "Psychologist can accept invite" ON public.clinic_members;

CREATE POLICY "Psychologist can accept invite"
  ON public.clinic_members FOR INSERT
  WITH CHECK (
    psychologist_user_id = auth.uid()
    AND public.has_pending_invite_for_clinic(clinic_id)
  );

