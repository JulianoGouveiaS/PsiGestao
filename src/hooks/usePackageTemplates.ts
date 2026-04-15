import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export interface PackageTemplate {
  id: string;
  user_id: string;
  name: string;
  total_sessions: number;
  session_price: number;
  created_at: string;
}

export function usePackageTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["package_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("package_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PackageTemplate[];
    },
    enabled: !!user,
  });
}

export function useCreatePackageTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: { name: string; total_sessions: number; session_price: number }) => {
      const { data, error } = await supabase
        .from("package_templates")
        .insert({ ...template, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as PackageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["package_templates"] });
    },
  });
}

export function useUpdatePackageTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PackageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("package_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PackageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["package_templates"] });
    },
  });
}

export function useDeletePackageTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("package_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["package_templates"] });
    },
  });
}
