import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {Json, Tables} from "@/integrations/supabase/types";

export type Anamnesis = Tables<"anamnesis">;

export interface AnamnesisData {
  chief_complaint: string;
  personal_history: string;
  family_dynamics: string;
  emotional_state: string;
  social_relationships: string;
  coping_strategies: string;
  previous_therapy: string;
  expectations: string;
  medications: string;
  additional_notes: string;
}

export const emptyAnamnesis: AnamnesisData = {
  chief_complaint: "",
  personal_history: "",
  family_dynamics: "",
  emotional_state: "",
  social_relationships: "",
  coping_strategies: "",
  previous_therapy: "",
  expectations: "",
  medications: "",
  additional_notes: "",
};

export function useAnamnesis(patientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["anamnesis", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis")
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!patientId,
  });
}

/** Returns all historical versions for display */
export function useAnamnesisHistory(patientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["anamnesis_history", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis")
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!patientId,
  });
}

export function useSaveAnamnesis() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: AnamnesisData; existingId?: string }) => {
      // Always INSERT a new version — never UPDATE, so history is preserved
      const { data: result, error } = await supabase
        .from("anamnesis")
        .insert({
          patient_id: patientId,
          user_id: user!.id,
          data: data as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis", vars.patientId] });
      queryClient.invalidateQueries({ queryKey: ["anamnesis_history", vars.patientId] });
    },
  });
}
