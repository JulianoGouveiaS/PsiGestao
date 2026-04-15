import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {format} from "date-fns";
import type {Session} from "@/hooks/useSessions";

const paymentBadge: Record<string, { label: string; color: string }> = {
  paid: { label: "Pago", color: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-800" },
  pending: { label: "Pendente", color: "bg-red-100 text-red-800" },
};

interface SessionsTableProps {
  sessions: Session[];
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sessões e Pagamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma sessão encontrada.
          </p>
        ) : (
          <div className="space-y-1">
            <div className="hidden sm:grid sm:grid-cols-5 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
              <span>Data</span>
              <span>Paciente</span>
              <span className="text-right">Valor</span>
              <span className="text-right">Pago</span>
              <span className="text-right">Status</span>
            </div>
            {sessions.map((s) => {
              const payment = s.payments?.[0];
              const pStatus = payment?.status ?? "pending";
              const badge = paymentBadge[pStatus] ?? paymentBadge.pending;
              const paid = payment ? Number(payment.amount_paid) : 0;
              const total = payment ? Number(payment.total_amount) : Number(s.price);

              return (
                <div
                  key={s.id}
                  className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 items-center px-3 py-3 rounded-lg hover:bg-muted/30 transition-colors text-sm"
                >
                  <span className="text-foreground">
                    {format(new Date(s.scheduled_at), "dd/MM/yyyy HH:mm")}
                  </span>
                  <span className="text-foreground font-medium">
                    {s.patients?.full_name ?? "—"}
                  </span>
                  <span className="text-right text-foreground">R$ {total.toFixed(2)}</span>
                  <span className={`text-right ${paid > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                    R$ {paid.toFixed(2)}
                  </span>
                  <span className="text-right">
                    <Badge className={badge.color}>{badge.label}</Badge>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
