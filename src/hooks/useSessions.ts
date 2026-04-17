import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {Tables, TablesInsert, TablesUpdate} from "@/integrations/supabase/types";

/** Statuses that free a package slot (reverse of "used") */
const STATUSES_THAT_FREE_SLOT = new Set<string>(["cancelled", "rescheduled"]);

async function incrementActivePackage(patientId: string, userId: string) {
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, sessions_used, total_sessions")
    .eq("patient_id", patientId)
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pkg && pkg.sessions_used < pkg.total_sessions) {
    await supabase
      .from("packages")
      .update({ sessions_used: pkg.sessions_used + 1 })
      .eq("id", pkg.id);
  }
}

async function decrementActivePackage(patientId: string, userId: string) {
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, sessions_used")
    .eq("patient_id", patientId)
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pkg && pkg.sessions_used > 0) {
    await supabase
      .from("packages")
      .update({ sessions_used: pkg.sessions_used - 1 })
      .eq("id", pkg.id);
  }
}

export type Session = Tables<"sessions"> & {
  patients?: { full_name: string } | null;
  payments?: Tables<"payments">[] | null;
  modality?: string;
  meeting_url?: string | null;
  series_id?: string | null;
};

export interface SessionDateRange {
  start: Date;
  end: Date;
}

export function useSessions(dateRange?: SessionDateRange) {
  const { user } = useAuth();

  const startKey = dateRange ? dateRange.start.toISOString().slice(0, 10) : undefined;
  const endKey = dateRange ? dateRange.end.toISOString().slice(0, 10) : undefined;

  return useQuery({
    queryKey: ["sessions", startKey, endKey],
    queryFn: async () => {
      let query = supabase
        .from("sessions")
        .select("*, patients(full_name), payments(*)")
        .order("scheduled_at");

      if (dateRange) {
        query = query
          .gte("scheduled_at", dateRange.start.toISOString())
          .lte("scheduled_at", dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!user,
  });
}

export function useSession(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, patients(full_name), payments(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Session;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      session: Omit<TablesInsert<"sessions">, "user_id"> & {
        /** Clinic admins may pass the target psychologist's user_id here */
        user_id_override?: string;
      }
    ) => {
      const { user_id_override, ...sessionData } = session;
      // Use the override (clinic admin creating for a psychologist) or the current user
      const targetUserId = user_id_override ?? user!.id;

      const { data, error } = await supabase
        .from("sessions")
        .insert({ ...sessionData, user_id: targetUserId })
        .select()
        .single();
      if (error) throw error;

      // Auto-create a pending payment for the correct user
      const { error: payError } = await supabase.from("payments").insert({
        session_id: data.id,
        user_id: targetUserId,
        total_amount: data.price,
        amount_paid: 0,
        status: "pending",
      });
      if (payError) throw payError;

      // Increment sessions_used on active package for the correct user
      await incrementActivePackage(data.patient_id, targetUserId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"sessions"> & { id: string }) => {
      // If transitioning to a slot-freeing status, decrement the package counter once
      if (updates.status && STATUSES_THAT_FREE_SLOT.has(updates.status) && user) {
        const { data: current } = await supabase
          .from("sessions")
          .select("patient_id, user_id, status")
          .eq("id", id)
          .single();

        // Only decrement if not already in a slot-freeing status (prevents double decrement)
        if (current && !STATUSES_THAT_FREE_SLOT.has(current.status)) {
          await decrementActivePackage(current.patient_id, current.user_id);
        }
      }

      const { data, error } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session", data.id] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useRescheduleSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      originalSessionId,
      newScheduledAt,
    }: {
      originalSessionId: string;
      newScheduledAt: string;
    }) => {
      // Get the original session
      const { data: original, error: fetchErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", originalSessionId)
        .single();
      if (fetchErr) throw fetchErr;

      // Mark original as rescheduled (useUpdateSession would also decrement,
      // but we do it manually here to keep the mutation atomic)
      const wasAlreadyFreeSlot = STATUSES_THAT_FREE_SLOT.has(original.status);

      const { error: updateErr } = await supabase
        .from("sessions")
        .update({ status: "rescheduled" as any })
        .eq("id", originalSessionId);
      if (updateErr) throw updateErr;

      // Decrement for the original session being freed
      if (!wasAlreadyFreeSlot) {
        await decrementActivePackage(original.patient_id, original.user_id);
      }

      // Create new session referencing the original (preserve the psychologist's user_id)
      const { data: newSession, error: insertErr } = await supabase
        .from("sessions")
        .insert({
          patient_id: original.patient_id,
          user_id: original.user_id,
          scheduled_at: newScheduledAt,
          price: original.price,
          modality: original.modality,
          rescheduled_from: originalSessionId,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Create pending payment for new session
      await supabase.from("payments").insert({
        session_id: newSession.id,
        user_id: original.user_id,
        total_amount: newSession.price,
        amount_paid: 0,
        status: "pending",
      });

      // Increment package counter for the new (replacement) session
      await incrementActivePackage(newSession.patient_id, original.user_id);

      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

/**
 * Hard-deletes a session and rolls back all side effects:
 * - deletes associated payments
 * - decrements the active package counter (unless session was already in a slot-freeing status)
 * - deletes the session record itself
 *
 * Use this to correct erroneously created sessions.
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // 1. Fetch session to know patient, user, and current status
      const { data: session, error: fetchErr } = await supabase
        .from("sessions")
        .select("id, patient_id, user_id, status")
        .eq("id", sessionId)
        .single();
      if (fetchErr) throw fetchErr;

      // 2. Delete associated payments
      const { error: payErr } = await supabase
        .from("payments")
        .delete()
        .eq("session_id", sessionId);
      if (payErr) throw payErr;

      // 3. Rollback package slot only if session was NOT already in a slot-freeing status
      //    (cancelled/rescheduled already decremented the counter when they transitioned)
      if (!STATUSES_THAT_FREE_SLOT.has(session.status)) {
        await decrementActivePackage(session.patient_id, session.user_id);
      }

      // 4. Delete the session itself
      const { error: delErr } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

/**
 * Updates all SCHEDULED sessions that share the same series_id.
 * Fields supported: scheduled_at offset (shift), price, modality.
 */
export function useUpdateSessionSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      updates,
    }: {
      seriesId: string;
      updates: { price?: number; modality?: string };
    }) => {
      const { error } = await supabase
        .from("sessions")
        .update(updates as any)
        .eq("series_id" as any, seriesId)
        .eq("status", "scheduled");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

