-- ============================================================
-- FIX: Corrigir admin_user_id incorreto em clinic_members
-- ============================================================

-- Problema: O admin_user_id em clinic_members não corresponde ao owner_id da clínica
-- Solução: Atualizar todos os registros para usar o owner_id correto

-- 1. Corrigir registros existentes
UPDATE public.clinic_members cm
SET admin_user_id = c.owner_id
FROM public.clinics c
WHERE cm.clinic_id = c.id
  AND cm.admin_user_id != c.owner_id;

-- 2. Verificar se a correção funcionou
SELECT
  cm.id,
  cm.clinic_id,
  cm.admin_user_id,
  c.owner_id as correct_owner_id,
  cm.admin_user_id = c.owner_id as is_correct,
  cm.psychologist_user_id,
  p.full_name as psychologist_name,
  cm.active
FROM public.clinic_members cm
JOIN public.clinics c ON c.id = cm.clinic_id
LEFT JOIN public.profiles p ON p.id = cm.psychologist_user_id
WHERE cm.active = TRUE
ORDER BY cm.created_at DESC;

