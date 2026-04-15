import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";

export interface TimelineItem {
  id: string;
  type: "session" | "payment" | "note";
  date: string;
  title: string;
  description: string;
  meta?: Record<string, string>;
}

export function usePatientTimeline(patientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patient_timeline", patientId],
    queryFn: async () => {
      // Step 1: fetch sessions for this patient
      const sessionsRes = await supabase
        .from("sessions")
        .select("*, payments(*)")
        .eq("patient_id", patientId!)
        .order("scheduled_at", { ascending: false });

      if (sessionsRes.error) throw sessionsRes.error;

      const sessionIds = sessionsRes.data.map((s) => s.id);

      // Step 2: fetch notes that belong to those sessions (correct filter, no nested join)
      let notesData: { id: string; content: string; created_at: string; session_id: string }[] = [];
      if (sessionIds.length > 0) {
        const notesRes = await supabase
          .from("session_notes")
          .select("id, content, created_at, session_id")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false });

        if (notesRes.error) throw notesRes.error;
        notesData = notesRes.data;
      }

      const items: TimelineItem[] = [];

      const statusLabels: Record<string, string> = {
        scheduled: "Agendada",
        completed: "Realizada",
        missed: "Falta",
        cancelled: "Cancelada",
        rescheduled: "Remarcada",
      };

      for (const s of sessionsRes.data) {
        items.push({
          id: `session-${s.id}`,
          type: "session",
          date: s.scheduled_at,
          title: `Sessão ${statusLabels[s.status] ?? s.status}`,
          description: `R$ ${Number(s.price).toFixed(2)}`,
          meta: { status: s.status, modality: (s as any).modality ?? "presencial" },
        });

        const payment = (s as any).payments?.[0];
        if (payment && Number(payment.amount_paid) > 0) {
          items.push({
            id: `payment-${payment.id}`,
            type: "payment",
            date: payment.created_at,
            title: `Pagamento ${payment.status === "paid" ? "integral" : "parcial"}`,
            description: `R$ ${Number(payment.amount_paid).toFixed(2)} de R$ ${Number(payment.total_amount).toFixed(2)}`,
            meta: { status: payment.status },
          });
        }
      }

      for (const n of notesData) {
        items.push({
          id: `note-${n.id}`,
          type: "note",
          date: n.created_at,
          title: "Nota de sessão",
          description: n.content.length > 120 ? n.content.slice(0, 120) + "..." : n.content,
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items;
    },
    enabled: !!user && !!patientId,
  });
}
