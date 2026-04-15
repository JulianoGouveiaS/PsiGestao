-- ============================================================
-- FIX: Adicionar FK de clinic_members para profiles
-- Permite JOIN automático do Supabase entre clinic_members e profiles
-- ============================================================

-- Adiciona constraint de FK de clinic_members.psychologist_user_id -> profiles.id
-- Isso permite que o Supabase faça o JOIN automaticamente
ALTER TABLE public.clinic_members
  ADD CONSTRAINT clinic_members_psychologist_user_id_profiles_fkey
  FOREIGN KEY (psychologist_user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Adiciona constraint de FK de clinic_members.admin_user_id -> profiles.id
-- Para consistência e permitir JOIN do admin também
ALTER TABLE public.clinic_members
  ADD CONSTRAINT clinic_members_admin_user_id_profiles_fkey
  FOREIGN KEY (admin_user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Comentários explicativos
COMMENT ON CONSTRAINT clinic_members_psychologist_user_id_profiles_fkey ON public.clinic_members IS
'Permite JOIN automático com profiles para buscar dados da psicóloga';

COMMENT ON CONSTRAINT clinic_members_admin_user_id_profiles_fkey ON public.clinic_members IS
'Permite JOIN automático com profiles para buscar dados do admin';

