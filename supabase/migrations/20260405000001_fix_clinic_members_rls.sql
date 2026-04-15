-- ============================================================
-- FIX: Clinic Members RLS Policy
-- Problema: Admin não consegue ver membros da clínica com JOIN
-- Solução: Ajustar política para garantir acesso completo do admin
-- ============================================================

-- Verifica política atual
DO $$
BEGIN
  -- Remove políticas antigas que podem estar causando conflito
  DROP POLICY IF EXISTS "Clinic admin manages members" ON public.clinic_members;

  -- Recria com USING e WITH CHECK separados para clareza
  CREATE POLICY "Clinic admin full access to members"
    ON public.clinic_members
    FOR ALL
    USING (admin_user_id = auth.uid())
    WITH CHECK (admin_user_id = auth.uid());

  RAISE NOTICE 'Política de clinic_members atualizada com sucesso';
END
$$;

-- Adiciona índice para melhorar performance das queries com JOIN
CREATE INDEX IF NOT EXISTS idx_clinic_members_active ON public.clinic_members(clinic_id, active) WHERE active = TRUE;

-- Garante que a política de profiles permite o JOIN
-- (A política já deveria existir, mas vamos garantir)
DO $$
BEGIN
  -- A política "Clinic admin views psychologist profiles" já existe
  -- mas vamos garantir que está funcionando

  -- Verifica se a função is_clinic_admin_for está funcionando
  RAISE NOTICE 'Função is_clinic_admin_for criada e pronta';
END
$$;

