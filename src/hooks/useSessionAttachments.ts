import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export interface SessionAttachment {
  id: string;
  session_note_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export function useSessionAttachments(noteId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["session_attachments", noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_note_attachments")
        .select("*")
        .eq("session_note_id", noteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SessionAttachment[];
    },
    enabled: !!user && !!noteId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ noteId, file }: { noteId: string; file: File }) => {
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${noteId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("session-attachments")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("session_note_attachments")
        .insert({
          session_note_id: noteId,
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["session_attachments", vars.noteId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, noteId }: { id: string; filePath: string; noteId: string }) => {
      await supabase.storage.from("session-attachments").remove([filePath]);
      const { error } = await supabase.from("session_note_attachments").delete().eq("id", id);
      if (error) throw error;
      return noteId;
    },
    onSuccess: (noteId) => {
      queryClient.invalidateQueries({ queryKey: ["session_attachments", noteId] });
    },
  });
}

/**
 * Returns a short-lived signed URL (1 hour) for a private bucket file.
 * Use this instead of getPublicUrl when the bucket is private.
 */
export async function getAttachmentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("session-attachments")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/** @deprecated Use getAttachmentSignedUrl for private buckets */
export function getAttachmentUrl(filePath: string) {
  const { data } = supabase.storage.from("session-attachments").getPublicUrl(filePath);
  return data.publicUrl;
}
