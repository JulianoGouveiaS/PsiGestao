-- ===========================================================
-- FIX: Reset stuck invites that were set to 'accepted' but
-- have no corresponding clinic_members record.
-- Run this in the Supabase SQL Editor to unblock the psychologist.
-- ===========================================================

UPDATE public.clinic_invites ci
SET
  status      = 'pending',
  resolved_at = NULL
WHERE ci.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.clinic_id             = ci.clinic_id
      AND cm.psychologist_user_id  = ci.invited_user_id
      AND cm.active                = TRUE
  );

