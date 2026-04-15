import {useMutation, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";

interface GenerateMeetLinkParams {
  sessionId: string;
  scheduledAt: string;
  patientName: string;
}

interface MeetLinkResult {
  meetLink: string;
  eventId?: string;
}

/**
 * Calls the generate-meet-link Edge Function to create a Google Meet link
 * and persists it on the session row.
 */
export function useGenerateMeetLink() {
  const queryClient = useQueryClient();

  return useMutation<MeetLinkResult, Error, GenerateMeetLinkParams>({
    mutationFn: async ({ sessionId, scheduledAt, patientName }) => {
      const { data, error } = await supabase.functions.invoke("generate-meet-link", {
        body: { scheduledAt, patientName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const meetLink: string = data?.meetLink;
      if (!meetLink) throw new Error("Link não retornado pela função");

      // Persist the link on the session
      const { error: updateErr } = await supabase
        .from("sessions")
        .update({ meeting_url: meetLink } as any)
        .eq("id", sessionId);
      if (updateErr) throw updateErr;

      return { meetLink, eventId: data?.eventId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

