import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useSessions } from "@/hooks/useSessions";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { distributePaymentFIFO, useRegisterPatientPayment } from "@/hooks/usePayments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SessionDebtRow {
  sessionId: string;
  paymentId: string;
  scheduledAt: string;
  total: number;
  paid: number;
  remaining: number;
  status: "paid" | "partial" | "pending";
}

interface PatientDebt {
  patientId: string;
  patientName: string;
  sessions: SessionDebtRow[];
  totalOwed: number;
  totalPaid: number;
  pendingCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  paid:    { label: "Pago",     className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  partial: { label: "Parcial",  className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  pending: { label: "Pendente", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge className={`text-xs font-medium border-0 ${cfg.className}`}>{cfg.label}</Badge>;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------------------------------------------------------------------------
// Register Payment Dialog
// ---------------------------------------------------------------------------
function RegisterPaymentDialog({ patient, open, onOpenChange }: {
  patient: PatientDebt | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const registerPayment = useRegisterPatientPayment();

  const amount = parseFloat(inputValue.replace(",", ".")) || 0;

  const unpaidSessions = useMemo(() =>
    (patient?.sessions ?? [])
      .filter((s) => s.status !== "paid")
      .map((s) => ({ paymentId: s.paymentId, total: s.total, paid: s.paid, scheduledAt: s.scheduledAt })),
    [patient]
  );

  const preview = useMemo(() => {
    if (amount <= 0) return [];
    return distributePaymentFIFO(unpaidSessions, amount);
  }, [amount, unpaidSessions]);

  const previewMap = useMemo(() => {
    const m: Record<string, { newPaid: number; total: number }> = {};
    preview.forEach((p) => { m[p.paymentId] = p; });
    return m;
  }, [preview]);

  const handleConfirm = async () => {
    if (amount <= 0) { toast.error("Informe um valor válido"); return; }
    if (amount > (patient?.totalOwed ?? 0)) { toast.error("Valor excede o saldo devedor do paciente"); return; }
    if (preview.length === 0) { toast.error("Nenhuma sessão para aplicar o pagamento"); return; }
    try {
      await registerPayment.mutateAsync(preview);
      toast.success(`${fmt(amount)} registrado para ${patient?.patientName}!`);
      setInputValue("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao registrar pagamento", { description: err.message });
    }
  };

  const handleClose = () => { setInputValue(""); onOpenChange(false); };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <p className="font-semibold text-foreground">{patient.patientName}</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{patient.pendingCount} sessão(ões) em aberto</span>
            <span>Devedor: <span className="font-medium text-rose-600 dark:text-rose-400">{fmt(patient.totalOwed)}</span></span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pay-amount">Valor recebido (R$)</Label>
          <Input
            id="pay-amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="text-lg"
            autoFocus
          />
          <Button variant="outline" size="sm" className="text-xs"
            onClick={() => setInputValue(String(patient.totalOwed))}>
            Pagar tudo ({fmt(patient.totalOwed)})
          </Button>
        </div>

        {amount > 0 && preview.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Como será distribuído</p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {patient.sessions
                .filter((s) => s.status !== "paid" || previewMap[s.paymentId])
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map((s) => {
                  const updated = previewMap[s.paymentId];
                  const finalPaid = updated ? updated.newPaid : s.paid;
                  const finalStatus: keyof typeof STATUS_CONFIG =
                    finalPaid >= s.total ? "paid" : finalPaid > 0 ? "partial" : "pending";
                  return (
                    <div key={s.sessionId}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        updated ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                      }`}>
                      {updated
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <span className="text-muted-foreground w-20 shrink-0">
                        {format(new Date(s.scheduledAt), "dd/MM/yy", { locale: ptBR })}
                      </span>
                      <span className="flex-1">{fmt(s.total)}</span>
                      {updated && (
                        <span className="text-xs text-muted-foreground">
                          +{fmt(updated.newPaid - s.paid)}
                        </span>
                      )}
                      <StatusBadge status={finalStatus} />
                    </div>
                  );
                })}
            </div>
            {amount > patient.totalOwed && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Valor excede o saldo devedor.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={amount <= 0 || amount > patient.totalOwed || preview.length === 0 || registerPayment.isPending}
          >
            {registerPayment.isPending ? "Registrando..." : "Confirmar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Patient expandable row
// ---------------------------------------------------------------------------
function PatientDebtRow({ patient, onRegister }: { patient: PatientDebt; onRegister: (p: PatientDebt) => void }) {
  const [expanded, setExpanded] = useState(false);
  const allPaid = patient.totalOwed === 0;

  return (
    <div className={`rounded-lg border transition-colors ${allPaid
      ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10"
      : "border-border bg-card"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{patient.patientName}</p>
          <p className="text-xs text-muted-foreground">
            {patient.sessions.length} sessão(ões) · {patient.pendingCount} em aberto
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Já pago</p>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{fmt(patient.totalPaid)}</p>
        </div>
        <div className="text-right min-w-[90px]">
          <p className="text-xs text-muted-foreground">Saldo devedor</p>
          <p className={`text-sm font-bold ${allPaid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {fmt(patient.totalOwed)}
          </p>
        </div>
        {allPaid
          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">Quitado</Badge>
          : <Button size="sm" onClick={() => onRegister(patient)}>
              <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Registrar
            </Button>}
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-2 space-y-1">
          <div className="grid grid-cols-4 gap-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">
            <span>Data</span>
            <span className="text-right">Total</span>
            <span className="text-right">Pago</span>
            <span className="text-center">Status</span>
          </div>
          {patient.sessions
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map((s) => (
              <div key={s.sessionId} className="grid grid-cols-4 gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(s.scheduledAt), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="text-right">{fmt(s.total)}</span>
                <span className="text-right text-emerald-600 dark:text-emerald-400">{fmt(s.paid)}</span>
                <div className="flex justify-center">
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({ title, value, icon: Icon, loading }: { title: string; value: string; icon: React.ElementType; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-foreground">{value}</p>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Payments() {
  const { data: sessions, isLoading } = useSessions();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid">("all");
  const [selectedPatient, setSelectedPatient] = useState<PatientDebt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useRealtimeSubscription("sessions", [["sessions"]]);
  useRealtimeSubscription("payments", [["payments"], ["sessions"]]);

  const patientDebts = useMemo<PatientDebt[]>(() => {
    if (!sessions) return [];
    const map: Record<string, PatientDebt> = {};

    for (const s of sessions) {
      if (s.status === "rescheduled" || s.status === "cancelled") continue;
      const pid = s.patient_id;
      const name = s.patients?.full_name ?? "Paciente desconhecido";
      const p = s.payments?.[0];
      const total = p ? Number(p.total_amount) : Number(s.price);
      const paid = p ? Number(p.amount_paid) : 0;
      const remaining = total - paid;
      const status: SessionDebtRow["status"] = (p?.status as SessionDebtRow["status"]) ?? "pending";

      if (!map[pid]) {
        map[pid] = { patientId: pid, patientName: name, sessions: [], totalOwed: 0, totalPaid: 0, pendingCount: 0 };
      }
      map[pid].sessions.push({ sessionId: s.id, paymentId: p?.id ?? "", scheduledAt: s.scheduled_at, total, paid, remaining, status });
      map[pid].totalOwed += remaining;
      map[pid].totalPaid += paid;
      if (status !== "paid") map[pid].pendingCount++;
    }

    return Object.values(map).sort((a, b) => b.totalOwed - a.totalOwed);
  }, [sessions]);

  const filtered = useMemo(() =>
    patientDebts.filter((p) => {
      if (search && !p.patientName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus === "pending" && p.totalOwed === 0) return false;
      if (filterStatus === "paid" && p.totalOwed > 0) return false;
      return true;
    }),
    [patientDebts, search, filterStatus]
  );

  const totalOwed = patientDebts.reduce((acc, p) => acc + p.totalOwed, 0);
  const totalReceived = patientDebts.reduce((acc, p) => acc + p.totalPaid, 0);
  const debtorCount = patientDebts.filter((p) => p.totalOwed > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Registre recebimentos por paciente — distribuição automática pelas sessões mais antigas (FIFO)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Total a Receber" value={fmt(totalOwed)} icon={TrendingDown} loading={isLoading} />
        <KpiCard title="Total Recebido" value={fmt(totalReceived)} icon={TrendingUp} loading={isLoading} />
        <KpiCard title="Pacientes Devedores" value={String(debtorCount)} icon={Users} loading={isLoading} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "paid"] as const).map((f) => (
            <Button key={f} variant={filterStatus === f ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(f)}>
              {f === "all" ? "Todos" : f === "pending" ? "Com débito" : "Quitados"}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))
          : filtered.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <CreditCard className="h-10 w-10 opacity-25" />
              <p className="text-sm">Nenhum paciente encontrado</p>
            </div>
          )
          : filtered.map((patient) => (
            <PatientDebtRow key={patient.patientId} patient={patient}
              onRegister={(p) => { setSelectedPatient(p); setDialogOpen(true); }} />
          ))}
      </div>

      <RegisterPaymentDialog
        patient={selectedPatient}
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setSelectedPatient(null); }}
      />
    </div>
  );
}
