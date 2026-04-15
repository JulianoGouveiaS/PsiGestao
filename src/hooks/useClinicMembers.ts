import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {ClinicPermissions} from "./useClinicInvites";

export interface ClinicMember {
  id: string;
  clinic_id: string;
  admin_user_id: string;
  psychologist_user_id: string;
  permissions: ClinicPermissions;
  active: boolean;
  created_at: string;
  /** Joined from profiles */
  profiles?: { full_name: string | null } | null;
}

/** Admin: list all psychologists in their clinic */
export function useClinicMembers(clinicId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clinic_members", clinicId],
    queryFn: async () => {
      console.log("[useClinicMembers] Fetching members for clinic:", clinicId);
      console.log("[useClinicMembers] Current user:", user?.id);
      
      const { data, error } = await supabase
        .from("clinic_members" as any)
        .select(`
          *,
          profiles!clinic_members_psychologist_user_id_profiles_fkey(full_name)
        `)
        .eq("clinic_id", clinicId!)
        .eq("active", true)
        .order("created_at", { ascending: true });
      
      console.log("[useClinicMembers] Query result:", { data, error });
      
      if (error) {
        console.error("[useClinicMembers] Error fetching members:", error);
        throw error;
      }
      
      console.log("[useClinicMembers] Returning members:", data?.length ?? 0);
      return (data ?? []) as unknown as ClinicMember[];
    },
    enabled: !!user && !!clinicId,
  });
}

/** Psychologist: list all clinics they're connected to */
export function useMyClinicMemberships() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my_clinic_memberships", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_members" as any)
        .select("*, clinics(name, description)")
        .eq("psychologist_user_id", user!.id)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (ClinicMember & {
        clinics: { name: string; description: string | null } | null;
      })[];
    },
    enabled: !!user,
  });
}

/** Psychologist: update permissions they grant to clinic */
export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      permissions,
    }: {
      memberId: string;
      permissions: ClinicPermissions;
    }) => {
      const { error } = await supabase
        .from("clinic_members" as any)
        .update({ permissions })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_clinic_memberships"] });
      queryClient.invalidateQueries({ queryKey: ["clinic_members"] });
    },
  });
}

/** Psychologist: disconnect from a clinic (deactivate membership) */
export function useDisconnectFromClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("clinic_members" as any)
        .update({ active: false })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_clinic_memberships"] });
      queryClient.invalidateQueries({ queryKey: ["clinic_members"] });
    },
  });
}

/** Admin: remove a psychologist from clinic */
export function useRemoveClinicMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, clinicId }: { memberId: string; clinicId: string }) => {
      const { error } = await supabase
        .from("clinic_members" as any)
        .update({ active: false })
        .eq("id", memberId);
      if (error) throw error;
      return clinicId;
    },
    onSuccess: (clinicId) => {
      queryClient.invalidateQueries({ queryKey: ["clinic_members", clinicId] });
    },
  });
}

