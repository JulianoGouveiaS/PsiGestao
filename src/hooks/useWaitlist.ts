import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export type WaitlistStatus = "waiting" | "scheduled" | "cancelled";

export type WaitlistEntry = {
  id: string;
  user_id: string;
  patient_id: string;
  preferred_day: number;
  preferred_time: string | null;
  notes: string | null;
  status: WaitlistStatus;
  created_at: string;
  patients?: { full_name: string } | null;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function getDayName(day: number) {
  return DAY_NAMES[day] || "";
}

export function useWaitlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*, patients(full_name)")
        .order("preferred_day")
        .order("preferred_time");
      if (error) throw error;
      return (data ?? []) as unknown as WaitlistEntry[];
    },
    enabled: !!user,
  });
}

export function useCreateWaitlistEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: {
      patient_id: string;
      preferred_day: number;
      preferred_time?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("waitlist")
        .insert({ ...entry, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waitlist"] }),
  });
}

export function useUpdateWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      status?: WaitlistStatus;
      notes?: string | null;
      preferred_day?: number;
      preferred_time?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("waitlist")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waitlist"] }),
  });
}

export function useDeleteWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("waitlist")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["waitlist"] }),
  });
}
