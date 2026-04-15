import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/contexts/AuthContext";
import type {Database, Tables} from "@/integrations/supabase/types";

export type Payment = Tables<"payments">;
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

function calcStatus(totalAmount: number, amountPaid: number): PaymentStatus {
  if (amountPaid >= totalAmount) return "paid";
  if (amountPaid > 0) return "partial";
  return "pending";
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
