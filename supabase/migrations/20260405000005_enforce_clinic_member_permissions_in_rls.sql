-- ============================================================
-- MIGRATION: Enforce clinic_members.permissions in RLS policies
-- ============================================================
-- BUG: is_clinic_admin_for() only checked if an active clinic_members
-- row existed. It completely ignored the `permissions` JSONB field,
-- meaning a psychologist who revoked secretary/admin permissions would
-- still have their data fully accessible by the clinic admin.
--
-- FIX:
--   1. Create clinic_admin_has_perm(target_user_id, perm_key) — a new
--      SECURITY DEFINER function that checks BOTH membership AND permission.
--   2. Drop/recreate all RLS policies that previously used is_clinic_admin_for()
--      so that each operation now requires the appropriate granular permission.
--
-- Permission → table mapping:
--   view_patients    → patients (SELECT), anamnesis (SELECT), packages (SELECT)
--                       waitlist (SELECT)
--   manage_sessions  → sessions (ALL), patients (write), payments (write),
--                       session_notes (ALL), session_note_attachments (ALL),
--                       anamnesis (write), packages (write), waitlist (write)
--   view_agenda      → sessions (SELECT) [read-only; manage_sessions also grants this]
--   view_finances    → payments (SELECT), packages (SELECT)
-- ============================================================

-- ============================================================
-- 1. NEW PERMISSION-AWARE HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.clinic_admin_has_perm(
  target_user_id UUID,
  perm_key       TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.clinic_members
    WHERE  admin_user_id        = auth.uid()
      AND  psychologist_user_id = target_user_id
      AND  active               = TRUE
      AND  (permissions ->> perm_key)::boolean IS TRUE
  );
$$;

COMMENT ON FUNCTION public.clinic_admin_has_perm(UUID, TEXT) IS
  'Returns TRUE if auth.uid() is an active clinic admin for target_user_id '
  'AND the given permission key is true in the clinic_members.permissions JSONB. '
  'Valid keys: view_agenda, manage_sessions, view_patients, view_finances.';

-- ============================================================
-- 2. PATIENTS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own patients"   ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;

CREATE POLICY "Users can view own patients" ON public.patients
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'view_patients')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own patients" ON public.patients
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can update own patients" ON public.patients
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can delete own patients" ON public.patients
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- ============================================================
-- 3. SESSIONS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own sessions"   ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'view_agenda')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can delete own sessions" ON public.sessions
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- ============================================================
-- 4. PAYMENTS
-- Session management (creating/completing sessions) also requires
-- read access to payment status, so manage_sessions grants SELECT too.
-- ============================================================

DROP POLICY IF EXISTS "Users can view own payments"   ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'view_finances')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can update own payments" ON public.payments
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can delete own payments" ON public.payments
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- ============================================================
-- 5. SESSION_NOTES (clinical notes — require manage_sessions)
-- ============================================================

DROP POLICY IF EXISTS "Users can view own session_notes"   ON public.session_notes;
DROP POLICY IF EXISTS "Users can insert own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can update own session_notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can delete own session_notes" ON public.session_notes;

CREATE POLICY "Users can view own session_notes" ON public.session_notes
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own session_notes" ON public.session_notes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can update own session_notes" ON public.session_notes
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can delete own session_notes" ON public.session_notes
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- ============================================================
-- 6. SESSION_NOTE_ATTACHMENTS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own attachments"   ON public.session_note_attachments;
DROP POLICY IF EXISTS "Users can insert own attachments" ON public.session_note_attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.session_note_attachments;

CREATE POLICY "Users can view own attachments" ON public.session_note_attachments
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own attachments" ON public.session_note_attachments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can delete own attachments" ON public.session_note_attachments
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- ============================================================
-- 7. ANAMNESIS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own anamnesis"   ON public.anamnesis;
DROP POLICY IF EXISTS "Users can insert own anamnesis" ON public.anamnesis;
DROP POLICY IF EXISTS "Users can update own anamnesis" ON public.anamnesis;

CREATE POLICY "Users can view own anamnesis" ON public.anamnesis
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'view_patients')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own anamnesis" ON public.anamnesis
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can update own anamnesis" ON public.anamnesis
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- ============================================================
-- 8. PACKAGES
-- ============================================================

DROP POLICY IF EXISTS "Users can view own packages"   ON public.packages;
DROP POLICY IF EXISTS "Users can insert own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can update own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can delete own packages" ON public.packages;

CREATE POLICY "Users can view own packages" ON public.packages
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'view_patients')
    OR clinic_admin_has_perm(user_id, 'view_finances')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own packages" ON public.packages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can update own packages" ON public.packages
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can delete own packages" ON public.packages
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

-- ============================================================
-- 9. PROFESSIONAL_SETTINGS
-- Remove the is_clinic_admin_for access — the clinic admin does not
-- need to read or write the psychologist's personal practice settings.
-- The ClinicAgenda already falls back to a default when the admin has
-- no settings record of their own.
-- ============================================================

DROP POLICY IF EXISTS "Users can view own settings" ON public.professional_settings;

CREATE POLICY "Users can view own settings" ON public.professional_settings
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 10. WAITLIST
-- ============================================================

DROP POLICY IF EXISTS "Users can view own waitlist"   ON public.waitlist;
DROP POLICY IF EXISTS "Users can insert own waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Users can update own waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Users can delete own waitlist" ON public.waitlist;

CREATE POLICY "Users can view own waitlist" ON public.waitlist
  FOR SELECT USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'view_patients')
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can insert own waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can update own waitlist" ON public.waitlist
  FOR UPDATE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );

CREATE POLICY "Users can delete own waitlist" ON public.waitlist
  FOR DELETE USING (
    user_id = auth.uid()
    OR clinic_admin_has_perm(user_id, 'manage_sessions')
  );
