import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {Tables, TablesInsert, TablesUpdate} from "@/integrations/supabase/types";

export type Patient = Tables<"patients">;

const PAGE_SIZE = 20;

export function usePatients(search?: string, page = 0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patients", search, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("patients")
        .select("*", { count: "exact" })
        .order("full_name")
        .range(from, to);

      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        patients: data ?? [],
        total: count ?? 0,
        hasMore: (count ?? 0) > to + 1,
      };
    },
    enabled: !!user,
  });
}

/** Flat list used by selects/comboboxes — no pagination needed */
export function useAllPatients(search?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("*")
        .order("full_name");

      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function usePatient(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (patient: Omit<TablesInsert<"patients">, "user_id">) => {
      const { data, error } = await supabase
        .from("patients")
        .insert({ ...patient, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"patients"> & { id: string }) => {
      const { data, error } = await supabase
        .from("patients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", data.id] });
    },
  });
}

/**
 * Clinic admin: create a patient on behalf of a specific psychologist.
 * The `user_id` field in the payload must be the target psychologist's ID.
 * RLS allows this when clinic_admin_has_perm(user_id, 'manage_patients') is true.
 */
export function useCreatePatientForPsych() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: TablesInsert<"patients">) => {
      const { data, error } = await supabase
        .from("patients")
        .insert(patient)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });
}
