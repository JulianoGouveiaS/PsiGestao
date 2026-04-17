import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {Database, Tables} from "@/integrations/supabase/types";

export type Payment = Tables<"payments">;
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export function calcStatus(totalAmount: number, amountPaid: number): PaymentStatus {
  if (amountPaid >= totalAmount) return "paid";
  if (amountPaid > 0) return "partial";
  return "pending";
}

/**
 * Distributes a payment amount across sessions FIFO (oldest first).
 * Returns only the sessions that will have their payment changed.
 */
export function distributePaymentFIFO(
  sessions: Array<{ paymentId: string; total: number; paid: number; scheduledAt: string }>,
  amount: number
): Array<{ paymentId: string; newPaid: number; total: number }> {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  let remaining = amount;
  const result: Array<{ paymentId: string; newPaid: number; total: number }> = [];

  for (const s of sorted) {
    if (remaining <= 0) break;
    const owed = s.total - s.paid;
    if (owed <= 0) continue;
    const paying = Math.min(remaining, owed);
    remaining -= paying;
    result.push({ paymentId: s.paymentId, newPaid: s.paid + paying, total: s.total });
  }
  return result;
}

export function usePayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, sessions(*, patients(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount_paid, total_amount }: { id: string; amount_paid: number; total_amount: number }) => {
      const status = calcStatus(total_amount, amount_paid);
      const { data, error } = await supabase
        .from("payments")
        .update({ amount_paid, total_amount, status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

/**
 * Registers a payment for a patient, distributing FIFO across their unpaid sessions.
 * Receives pre-computed updates (from distributePaymentFIFO) and applies them in batch.
 */
export function useRegisterPatientPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Array<{ paymentId: string; newPaid: number; total: number }>
    ) => {
      for (const u of updates) {
        const status = calcStatus(u.total, u.newPaid);
        const { error } = await supabase
          .from("payments")
          .update({ amount_paid: u.newPaid, status })
          .eq("id", u.paymentId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
