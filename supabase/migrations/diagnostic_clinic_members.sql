-- ===========================================================
-- DIAGNOSTIC: Check why clinic_members is not showing up
-- Run this in the Supabase SQL Editor while logged in as the
-- clinic admin to see what's visible to you.
-- ===========================================================

-- 1. Raw data - what exists in clinic_members?
SELECT
  cm.id,
  cm.clinic_id,
  cm.admin_user_id,
  cm.psychologist_user_id,
  cm.active,
  c.owner_id AS clinic_owner,
  p.full_name AS psych_name,
  auth.uid() AS my_user_id
FROM public.clinic_members cm
JOIN public.clinics c ON c.id = cm.clinic_id
LEFT JOIN public.profiles p ON p.id = cm.psychologist_user_id
WHERE cm.active = TRUE;

-- 2. What can the current user see via RLS?
-- (This will be filtered by the "Clinic admin manages members" policy)
SELECT *
FROM public.clinic_members
WHERE active = TRUE;

-- 3. Check if the current user owns a clinic
SELECT id, name, owner_id, auth.uid() AS my_user_id
FROM public.clinics;

