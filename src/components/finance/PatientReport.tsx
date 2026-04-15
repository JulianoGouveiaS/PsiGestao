import {useMemo} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {useNavigate} from "react-router-dom";
import type {Session} from "@/hooks/useSessions";

interface PatientReportProps {
  sessions: Session[];
}

interface PatientSummary {
  id: string;
  name: string;
  totalSessions: number;
  totalAmount: number;
  totalPaid: number;
  pending: number;
  paidPercent: number;
}

export function PatientReport({ sessions }: PatientReportProps) {
  const navigate = useNavigate();

  const patients = useMemo(() => {
    const map = new Map<string, PatientSummary>();

    sessions.forEach((s) => {
      const pid = s.patient_id;
      const name = s.patients?.full_name ?? "—";
      const existing = map.get(pid) ?? {
        id: pid,
        name,
        totalSessions: 0,
        totalAmount: 0,
        totalPaid: 0,
        pending: 0,
        paidPercent: 0,
      };

      existing.totalSessions++;
      const p = s.payments?.[0];
      const total = p ? Number(p.total_amount) : Number(s.price);
      const paid = p ? Number(p.amount_paid) : 0;
      existing.totalAmount += total;
      existing.totalPaid += paid;
      existing.pending += total - paid;

      map.set(pid, existing);
    });

    return Array.from(map.values())
      .map((p) => ({
        ...p,
        paidPercent: p.totalAmount > 0 ? (p.totalPaid / p.totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.pending - a.pending);
  }, [sessions]);

  if (patients.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Relatório por Paciente</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Relatório por Paciente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Header */}
        <div className="hidden sm:grid sm:grid-cols-6 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
          <span className="col-span-2">Paciente</span>
          <span className="text-right">Sessões</span>
          <span className="text-right">Total</span>
          <span className="text-right">Pendente</span>
          <span>Progresso</span>
        </div>
        {patients.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/patients/${p.id}`)}
            className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-3 items-center px-3 py-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer text-sm"
          >
            <span className="col-span-2 font-medium text-foreground truncate">{p.name}</span>
            <span className="text-right text-foreground">{p.totalSessions}</span>
            <span className="text-right text-foreground">R$ {p.totalAmount.toFixed(2)}</span>
            <span className={`text-right ${p.pending > 0 ? "text-red-600 font-semibold" : "text-emerald-600"}`}>
              {p.pending > 0 ? `R$ ${p.pending.toFixed(2)}` : "—"}
            </span>
            <div className="flex items-center gap-2">
              <Progress value={p.paidPercent} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-10 text-right">{p.paidPercent.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
