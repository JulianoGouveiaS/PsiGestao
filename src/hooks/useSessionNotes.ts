import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {Tables} from "@/integrations/supabase/types";

export type SessionNote = Tables<"session_notes">;

export function useSessionNotes(sessionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["session_notes", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_notes")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!sessionId,
  });
}

export function useUpsertSessionNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sessionId, content, noteId }: { sessionId: string; content: string; noteId?: string }) => {
      if (noteId) {
        const { data, error } = await supabase
          .from("session_notes")
          .update({ content })
          .eq("id", noteId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("session_notes")
          .insert({ session_id: sessionId, content, user_id: user!.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["session_notes", vars.sessionId] });
    },
  });
}
