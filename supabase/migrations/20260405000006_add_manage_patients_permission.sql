-- ============================================================
-- MIGRATION: Add manage_patients permission
-- ============================================================
-- Adds a new `manage_patients` permission key that allows a clinic
-- admin (secretary) to CREATE, EDIT, and INACTIVATE patients on
-- behalf of a managed psychologist, independently of manage_sessions.
--
-- Permission → operation mapping:
--   manage_patients → patients  INSERT  (user_id = target psych)
--   manage_patients → patients  UPDATE  (edit / status toggle)
--   manage_patients → patients  SELECT  (needed to list before editing)
-- ============================================================

-- Update function comment to document the new key
COMMENT ON FUNCTION public.clinic_admin_has_perm(UUID, TEXT) IS
  'Returns TRUE if auth.uid() is an active clinic admin for target_user_id '
  'AND the given permission key is true in the clinic_members.permissions JSONB. '
  'Valid keys: view_agenda, manage_sessions, view_patients, view_finances, manage_patients.';

-- ============================================================
-- patients: extend policies to include manage_patients
-- ============================================================

DROP POLICY IF EXISTS "Users can view own patients"   ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;

-- SELECT: view_patients OR manage_patients OR manage_sessions all grant read
CREATE POLICY "Users can view own patients" ON public.patients
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'view_patients')
    OR clinic_admin_has_perm(user_id, 'manage_patients')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- INSERT: manage_patients (create on behalf of psych) OR manage_sessions
CREATE POLICY "Users can insert own patients" ON public.patients
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_patients')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- UPDATE: manage_patients (edit/inactivate) OR manage_sessions
CREATE POLICY "Users can update own patients" ON public.patients
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_patients')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- DELETE: only own record or manage_sessions (manage_patients intentionally excluded)
CREATE POLICY "Users can delete own patients" ON public.patients
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );
