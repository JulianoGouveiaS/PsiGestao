-- ============================================================
-- TRIGGER: Garantir que admin_user_id seja sempre o owner da clínica
-- ============================================================

-- Cria função que força admin_user_id a ser sempre o owner da clínica
CREATE OR REPLACE FUNCTION public.ensure_admin_user_id_matches_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Busca o owner_id da clínica
  SELECT owner_id INTO v_owner_id
  FROM public.clinics
  WHERE id = NEW.clinic_id
  LIMIT 1;

  -- Se encontrou, força o admin_user_id correto
  IF v_owner_id IS NOT NULL THEN
    NEW.admin_user_id := v_owner_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS clinic_member_ensure_admin_user_id ON public.clinic_members;

-- Cria trigger que executa antes de INSERT ou UPDATE
CREATE TRIGGER clinic_member_ensure_admin_user_id
  BEFORE INSERT OR UPDATE ON public.clinic_members
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_admin_user_id_matches_owner();

-- Comentário explicativo
COMMENT ON FUNCTION public.ensure_admin_user_id_matches_owner() IS
'Garante que o admin_user_id em clinic_members seja sempre o owner_id da clínica correspondente. Previne inconsistências que impedem o admin de ver seus membros via RLS.';

