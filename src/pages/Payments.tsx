import { useState } from "react";
import { CreditCard, Search, TrendingDown, TrendingUp, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSessions } from "@/hooks/useSessions";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  paid: { label: "Pago", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  partial: { label: "Parcial", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  pending: { label: "Pendente", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" },
} as const;

type PaymentStatus = keyof typeof STATUS_CONFIG;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as PaymentStatus] ?? STATUS_CONFIG.pending;
  return <Badge className={`text-xs font-medium border-0 ${cfg.className}`}>{cfg.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Summary KPI card
// ---------------------------------------------------------------------------
function KpiCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Row skeleton
// ---------------------------------------------------------------------------
function RowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Payments() {
  const { data: sessions, isLoading } = useSessions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");

  useRealtimeSubscription("sessions", [["sessions"]]);
  useRealtimeSubscription("payments", [["payments"], ["sessions"]]);

  // Flatten sessions into a payment-centric view
  const paymentRows = (sessions ?? [])
    .filter((s) => s.status !== "rescheduled" && s.status !== "cancelled")
    .map((s) => {
      const p = s.payments?.[0];
      const total = p ? Number(p.total_amount) : Number(s.price);
      const paid = p ? Number(p.amount_paid) : 0;
      const remaining = total - paid;
      const status: PaymentStatus = (p?.status as PaymentStatus) ?? "pending";
      return {
        sessionId: s.id,
        patientName: s.patients?.full_name ?? "—",
        scheduledAt: s.scheduled_at,
        total,
        paid,
        remaining,
        status,
        paymentId: p?.id ?? null,
      };
    });

  // Filters
  const filtered = paymentRows.filter((row) => {
    if (search && !row.patientName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    return true;
  });

  // KPIs
  const totalReceived = paymentRows.reduce((acc, r) => acc + r.paid, 0);
  const totalPending = paymentRows.reduce((acc, r) => acc + r.remaining, 0);
  const totalPartial = paymentRows.filter((r) => r.status === "partial").length;

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie e acompanhe os pagamentos das sessões
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Recebido"
          value={fmt(totalReceived)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <KpiCard
          title="Total Pendente"
          value={fmt(totalPending)}
          icon={TrendingDown}
          loading={isLoading}
        />
        <KpiCard
          title="Pagamentos Parciais"
          value={String(totalPartial)}
          icon={Clock}
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "paid", "partial", "pending"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                : filtered.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhum pagamento encontrado
                    </TableCell>
                  </TableRow>
                )
                : filtered.map((row) => (
                  <TableRow key={row.sessionId}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(row.scheduledAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{row.patientName}</TableCell>
                    <TableCell className="text-right">{fmt(row.total)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {fmt(row.paid)}
                    </TableCell>
                    <TableCell className="text-right text-rose-600 dark:text-rose-400">
                      {fmt(row.remaining)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Placeholder for future actions (register payment, view detail, etc.) */}
                      <Button variant="ghost" size="sm" disabled className="text-xs">
                        Registrar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}




