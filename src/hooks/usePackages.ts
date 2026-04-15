import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {Tables, TablesInsert, TablesUpdate} from "@/integrations/supabase/types";

export type Package = Tables<"packages"> & {
  patients?: { full_name: string } | null;
};

export function usePackages(patientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["packages", patientId],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select("*, patients(full_name)")
        .order("created_at", { ascending: false });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Package[];
    },
    enabled: !!user,
  });
}

export function useActivePackage(patientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["packages", "active", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("patient_id", patientId!)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!patientId,
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (pkg: Omit<TablesInsert<"packages">, "user_id" | "period_start" | "period_end"> & { period_start?: string; period_end?: string }) => {
      // Deactivate any existing active package for this patient
      await supabase
        .from("packages")
        .update({ active: false })
        .eq("patient_id", pkg.patient_id)
        .eq("user_id", user!.id)
        .eq("active", true);

      const { data, error } = await supabase
        .from("packages")
        .insert({ ...pkg, user_id: user!.id, active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["packages", data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ["packages", "active", data.patient_id] });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"packages"> & { id: string }) => {
      // If activating this package, deactivate others for same patient
      if (updates.active === true) {
        const { data: current } = await supabase.from("packages").select("patient_id, user_id").eq("id", id).single();
        if (current) {
          await supabase
            .from("packages")
            .update({ active: false })
            .eq("patient_id", current.patient_id)
            .eq("user_id", current.user_id)
            .eq("active", true)
            .neq("id", id);
        }
      }

      const { data, error } = await supabase
        .from("packages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["packages", data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ["packages", "active", data.patient_id] });
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}