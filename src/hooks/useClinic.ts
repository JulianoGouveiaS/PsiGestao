import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export interface Clinic {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useClinic() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clinic", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics" as any)
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Clinic | null;
    },
    enabled: !!user,
  });
}

export function useUpsertClinic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("clinics" as any)
        .upsert({ ...payload, owner_id: user!.id }, { onConflict: "owner_id" })
        .select()
        .single();
      if (error) throw error;
      return data as Clinic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic"] });
    },
  });
}

