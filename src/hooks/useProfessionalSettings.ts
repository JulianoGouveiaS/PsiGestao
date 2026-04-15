import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export interface ProfessionalSettings {
  id: string;
  user_id: string;
  default_session_price: number;
  session_duration_minutes: number;
  calendar_start_hour: number;
  calendar_end_hour: number;
  lunch_start: string | null;
  lunch_end: string | null;
  working_days: number[];
}

const DEFAULTS: Omit<ProfessionalSettings, "id" | "user_id"> = {
  default_session_price: 150,
  session_duration_minutes: 50,
  calendar_start_hour: 7,
  calendar_end_hour: 22,
  lunch_start: "12:00",
  lunch_end: "13:00",
  working_days: [1, 2, 3, 4, 5],
};

export function useProfessionalSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["professional_settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as ProfessionalSettings;
      // Return defaults if no row exists yet
      return { ...DEFAULTS, id: "", user_id: user!.id } as ProfessionalSettings;
    },
    enabled: !!user,
  });
}

export function useUpsertProfessionalSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<ProfessionalSettings, "id" | "user_id">>) => {
      // Check if row exists
      const { data: existing } = await supabase
        .from("professional_settings")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("professional_settings")
          .update({ ...settings, updated_at: new Date().toISOString() } as any)
          .eq("user_id", user!.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("professional_settings")
          .insert({ ...DEFAULTS, ...settings, user_id: user!.id } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional_settings"] });
    },
  });
}
