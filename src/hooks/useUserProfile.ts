import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export type UserRole = "psychologist" | "clinic_admin";

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as unknown as UserProfile;
    },
    enabled: !!user,
  });
}

