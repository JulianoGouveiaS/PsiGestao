import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export interface ClinicPermissions {
  view_agenda: boolean;
  manage_sessions: boolean;
  view_patients: boolean;
  view_finances: boolean;
  manage_patients: boolean;
}

export const DEFAULT_PERMISSIONS: ClinicPermissions = {
  view_agenda: true,
  manage_sessions: true,
  view_patients: true,
  view_finances: true,
  manage_patients: false,
};

export type InviteStatus = "pending" | "accepted" | "rejected";

export interface ClinicInvite {
  id: string;
  clinic_id: string;
  invited_email: string;
  invited_user_id: string | null;
  status: InviteStatus;
  permissions: ClinicPermissions;
  created_at: string;
  resolved_at: string | null;
  clinics?: { name: string } | null;
}

/** List invites sent by the clinic admin */
export function useClinicInvites(clinicId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clinic_invites", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_invites" as any)
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClinicInvite[];
    },
    enabled: !!user && !!clinicId,
  });
}

/** List pending invites for the logged-in psychologist (matched by email) */
export function usePendingInvitesForMe() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clinic_invites_for_me", user?.id],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("clinic_invites" as any)
        .select("*, clinics(name)")
        .eq("invited_email", user.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClinicInvite[];
    },
    enabled: !!user,
  });
}

/** Send invite from clinic admin to a psychologist email */
export function useSendClinicInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clinicId,
      email,
      permissions = DEFAULT_PERMISSIONS,
    }: {
      clinicId: string;
      email: string;
      permissions?: ClinicPermissions;
    }) => {
      // Use upsert so that re-sending to the same email resets a stuck/rejected invite
      // back to 'pending' instead of throwing a duplicate-key error.
      const { data, error } = await supabase
        .from("clinic_invites" as any)
        .upsert(
          {
            clinic_id: clinicId,
            invited_email: email,
            permissions,
            status: "pending",
            resolved_at: null,
          },
          { onConflict: "clinic_id,invited_email" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicInvite;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["clinic_invites", vars.clinicId] });
    },
  });
}

/** Psychologist resolves an invite (accept or reject) */
export function useRespondToInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      inviteId,
      status,
      clinicId,
      adminUserId,
      permissions,
    }: {
      inviteId: string;
      status: "accepted" | "rejected";
      clinicId: string;
      adminUserId: string;
      permissions: ClinicPermissions;
    }) => {
      if (status === "accepted") {
        // Create the clinic_members record FIRST while the invite is still 'pending'.
        // The RLS policy "Psychologist can accept invite" uses has_pending_invite_for_clinic()
        // which requires the invite to still be in 'pending' state — so we must insert
        // the membership before updating the invite status.
        const { error: memberErr } = await supabase
          .from("clinic_members" as any)
          .upsert(
            {
              clinic_id: clinicId,
              admin_user_id: adminUserId,
              psychologist_user_id: user!.id,
              permissions,
              active: true,
            },
            { onConflict: "clinic_id,psychologist_user_id" }
          );
        if (memberErr) throw memberErr;
      }

      // Mark the invite as resolved AFTER the membership was created (or for reject, right away)
      const { error: inviteErr } = await supabase
        .from("clinic_invites" as any)
        .update({ status, resolved_at: new Date().toISOString(), invited_user_id: user!.id })
        .eq("id", inviteId);
      if (inviteErr) throw inviteErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_invites_for_me"] });
      queryClient.invalidateQueries({ queryKey: ["clinic_members"] });
    },
  });
}

/** Revoke invite (admin cancels a pending invite) */
export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, clinicId }: { inviteId: string; clinicId: string }) => {
      const { error } = await supabase
        .from("clinic_invites" as any)
        .delete()
        .eq("id", inviteId);
      if (error) throw error;
      return clinicId;
    },
    onSuccess: (clinicId) => {
      queryClient.invalidateQueries({ queryKey: ["clinic_invites", clinicId] });
    },
  });
}



