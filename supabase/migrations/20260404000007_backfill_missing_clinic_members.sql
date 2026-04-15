-- ===========================================================
-- FIX: Create missing clinic_members records for invites that
-- were accepted but whose membership insert failed (old bug).
-- Run this in the Supabase SQL Editor.
-- ===========================================================

-- First, see what we have (diagnostic)
-- SELECT
--   ci.id AS invite_id,
--   ci.invited_email,
--   ci.status,
--   ci.invited_user_id,
--   c.owner_id,
--   cm.id AS member_id,
--   cm.active
-- FROM public.clinic_invites ci
-- JOIN public.clinics c ON c.id = ci.clinic_id
-- LEFT JOIN public.clinic_members cm
--   ON cm.clinic_id = ci.clinic_id AND cm.psychologist_user_id = ci.invited_user_id
-- WHERE ci.status = 'accepted';

-- Backfill: for every accepted invite that has no active clinic_members row,
-- create the membership record now.
INSERT INTO public.clinic_members (
  clinic_id,
  admin_user_id,
  psychologist_user_id,
  permissions,
  active
)
SELECT
  ci.clinic_id,
  c.owner_id          AS admin_user_id,
  ci.invited_user_id  AS psychologist_user_id,
  ci.permissions,
  TRUE
FROM public.clinic_invites ci
JOIN public.clinics c ON c.id = ci.clinic_id
WHERE ci.status        = 'accepted'
  AND ci.invited_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.clinic_id            = ci.clinic_id
      AND cm.psychologist_user_id = ci.invited_user_id
  )
ON CONFLICT (clinic_id, psychologist_user_id)
DO UPDATE SET active = TRUE, permissions = EXCLUDED.permissions;


