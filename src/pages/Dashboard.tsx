import {useMemo} from "react";
import {
    differenceInDays,
    endOfMonth,
    endOfWeek,
    format,
    getDate,
    getMonth,
    isFuture,
    isToday,
    isTomorrow,
    isWithinInterval,
    parseISO,
    startOfMonth,
    startOfWeek,
    subMonths,
} from "date-fns";
import {ptBR} from "date-fns/locale";
import {motion} from "framer-motion";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {useSessions} from "@/hooks/useSessions";
import {useAllPatients} from "@/hooks/usePatients";
import {usePayments} from "@/hooks/usePayments";
import {DashboardSkeleton} from "@/components/DashboardSkeleton";
import {AnimatedCounter} from "@/components/AnimatedCounter";
import {StaggerItem, StaggerList} from "@/components/StaggerList";
import {
    AlertCircle,
    Cake,
    CalendarCheck,
    CalendarDays,
    Clock,
    MapPin,
    PercentCircle,
    TrendingUp,
    Users,
    UserX,
    Video,
} from "lucide-react";
import {useNavigate} from "react-router-dom";

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.07, type: "spring", stiffness: 260, damping: 24 },
  }),
};

// ─── Module-level constants (stable references, no remounting) ───────────────
const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  missed: "Falta",
  cancelled: "Cancelada",
};

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  missed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
};

interface Session {
  id: string;
  scheduled_at: string;
  status: string;
  modality?: string | null;
  patients?: { full_name: string } | null;
}

function SessionList({ items, emptyMsg }: { items: Session[]; emptyMsg: string }) {
  const navigate = useNavigate();
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground py-4 text-center">{emptyMsg}</p>;
  return (
    <div className="space-y-2">
      {items.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => navigate("/agenda")}
        >
          <div className="flex items-center gap-3 min-w-0">
            {s.modality === "online" ? (
              <Video className="h-4 w-4 text-blue-500 shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 text-primary shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{s.patients?.full_name ?? "Paciente"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(s.scheduled_at), "HH:mm")}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={statusColor[s.status] ?? ""}>
            {statusLabel[s.status] ?? s.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: patients = [], isLoading: patientsLoading } = useAllPatients();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const navigate = useNavigate();

  const isLoading = sessionsLoading || patientsLoading || paymentsLoading;

  const now = new Date();
  const currentMonth = getMonth(now);

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => isToday(parseISO(s.scheduled_at)) && s.status !== "rescheduled")
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [sessions],
  );

  const tomorrowSessions = useMemo(
    () =>
      sessions
        .filter((s) => isTomorrow(parseISO(s.scheduled_at)) && s.status !== "rescheduled")
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [sessions],
  );

  const weekSessions = useMemo(() => {
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    return sessions.filter((s) => {
      const d = parseISO(s.scheduled_at);
      return d >= ws && d <= we && s.status !== "rescheduled";
    });
  }, [sessions]);

  const pendingPayments = useMemo(
    () => payments.filter((p) => {
      if (p.status === "paid") return false;
      // Exclude payments tied to rescheduled sessions
      const session = sessions.find((s) => s.id === p.session_id);
      if (session?.status === "rescheduled") return false;
      return true;
    }),
    [payments, sessions],
  );

  const totalPending = useMemo(
    () => pendingPayments.reduce((sum, p) => sum + (Number(p.total_amount) - Number(p.amount_paid)), 0),
    [pendingPayments],
  );

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === "active").length,
    [patients],
  );

  // Aniversariantes do mês
  const birthdayPatients = useMemo(() => {
    return patients
      .filter((p) => {
        if (!p.birth_date) return false;
        return getMonth(parseISO(p.birth_date)) === currentMonth;
      })
      .sort((a, b) => {
        const dayA = getDate(parseISO(a.birth_date!));
        const dayB = getDate(parseISO(b.birth_date!));
        return dayA - dayB;
      });
  }, [patients, currentMonth]);

  // Próximos agendamentos (futuras, excluindo remarcadas)
  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((s) => isFuture(parseISO(s.scheduled_at)) && s.status === "scheduled")
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 5),
    [sessions],
  );

  // Pacientes sem sessão há mais de 30 dias
  const inactivePatients = useMemo(() => {
    const patientLastSession = new Map<string, Date>();
    sessions.forEach((s) => {
      if (s.status === "rescheduled") return;
      const d = parseISO(s.scheduled_at);
      const current = patientLastSession.get(s.patient_id);
      if (!current || d > current) patientLastSession.set(s.patient_id, d);
    });

    return patients
      .filter((p) => {
        if (p.status !== "active") return false;
        const last = patientLastSession.get(p.id);
        if (!last) return true; // nunca teve sessão
        return differenceInDays(now, last) > 30;
      })
      .slice(0, 5);
  }, [patients, sessions]);

  // Taxa de faltas do mês
  const missedRate = useMemo(() => {
    const ms = startOfMonth(now);
    const me = endOfMonth(now);
    const monthSessions = sessions.filter(
      (s) =>
        isWithinInterval(parseISO(s.scheduled_at), { start: ms, end: me }) &&
        s.status !== "rescheduled" &&
        s.status !== "scheduled",
    );
    if (monthSessions.length === 0) return null;
    const missed = monthSessions.filter((s) => s.status === "missed").length;
    return { rate: (missed / monthSessions.length) * 100, missed, total: monthSessions.length };
  }, [sessions]);

  // Receita do mês
  const monthRevenue = useMemo(() => {
    const ms = startOfMonth(now);
    const me = endOfMonth(now);
    return payments
      .filter((p) => isWithinInterval(parseISO(p.created_at), { start: ms, end: me }))
      .reduce((sum, p) => sum + Number(p.amount_paid), 0);
  }, [payments]);

  const lastMonthRevenue = useMemo(() => {
    const ref = subMonths(now, 1);
    const ms = startOfMonth(ref);
    const me = endOfMonth(ref);
    return payments
      .filter((p) => isWithinInterval(parseISO(p.created_at), { start: ms, end: me }))
      .reduce((sum, p) => sum + Number(p.amount_paid), 0);
  }, [payments]);

  const revenueGrowth = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          {
            label: "Sessões Hoje",
            value: todaySessions.length,
            icon: CalendarCheck,
            iconClass: "text-primary",
            navigate: "/agenda",
          },
          {
            label: "Sessões Semana",
            value: weekSessions.length,
            icon: TrendingUp,
            iconClass: "text-emerald-500",
            navigate: "/agenda",
          },
          {
            label: "Pacientes Ativos",
            value: activePatients,
            icon: Users,
            iconClass: "text-blue-500",
            navigate: "/patients",
          },
          {
            label: "Receita do Mês",
            value: monthRevenue,
            icon: TrendingUp,
            iconClass: "text-emerald-500",
            navigate: "/finances",
            prefix: "R$ ",
            decimals: 2,
            extra: revenueGrowth !== null ? (
              <p className={`text-[11px] mt-1 ${revenueGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth.toFixed(0)}% vs mês anterior
              </p>
            ) : null,
          },
          {
            label: "Pendente",
            value: totalPending,
            icon: AlertCircle,
            iconClass: "text-red-500",
            navigate: "/finances",
            prefix: "R$ ",
            decimals: 2,
            valueClass: "text-red-600",
          },
        ].map(({ label, value, icon: Icon, iconClass, navigate: nav, prefix = "", decimals = 0, valueClass, extra }, i) => (
          <motion.div key={label} custom={i} variants={cardVariants} initial="hidden" animate="show">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(nav)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${iconClass}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${valueClass ?? ""}`}>
                  <AnimatedCounter value={value} prefix={prefix} decimals={decimals} />
                </p>
                {extra}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Today & Tomorrow */}
      <StaggerList className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionList items={todaySessions} emptyMsg="Nenhuma sessão hoje" />
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Amanhã</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionList items={tomorrowSessions} emptyMsg="Nenhuma sessão amanhã" />
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerList>

      {/* Bottom row: Upcoming, Birthdays, Inactive, Missed rate */}
      <StaggerList className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {/* Próximos agendamentos */}
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
              <CalendarDays className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum agendamento futuro</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => navigate("/agenda")}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.patients?.full_name ?? "Paciente"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(s.scheduled_at), "dd/MM · HH:mm")}
                      </p>
                    </div>
                    {s.modality === "online" ? (
                      <Video className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </StaggerItem>

        {/* Aniversariantes do mês */}
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Aniversariantes 🎂</CardTitle>
              <Cake className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              {birthdayPatients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum aniversariante este mês</p>
              ) : (
                <div className="space-y-3">
                  {birthdayPatients.map((p) => {
                    const day = getDate(parseISO(p.birth_date!));
                    const isToday_ = day === getDate(now);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                        onClick={() => navigate(`/patients/${p.id}`)}
                      >
                        <p className="text-sm font-medium truncate">{p.full_name}</p>
                        <Badge variant={isToday_ ? "default" : "outline"} className="shrink-0 text-xs">
                          {isToday_ ? "Hoje! 🎉" : `Dia ${day}`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Pacientes sem sessão recente */}
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sem Sessão Recente</CardTitle>
              <UserX className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {inactivePatients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Todos os pacientes estão em dia</p>
              ) : (
                <div className="space-y-3">
                  {inactivePatients.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      <p className="text-sm font-medium truncate">{p.full_name}</p>
                      <Badge variant="outline" className="shrink-0 text-xs text-amber-600 border-amber-300">
                        +30 dias
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Taxa de faltas */}
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Taxa de Faltas</CardTitle>
              <PercentCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {missedRate === null ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem dados neste mês</p>
              ) : (
                <div className="text-center py-2">
                  <p className={`text-3xl font-bold ${missedRate.rate > 15 ? "text-red-600" : "text-emerald-600"}`}>
                    <AnimatedCounter value={missedRate.rate} decimals={0} suffix="%" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {missedRate.missed} falta{missedRate.missed !== 1 ? "s" : ""} em {missedRate.total} sessão{missedRate.total !== 1 ? "ões" : ""}
                  </p>
                  {missedRate.rate > 15 && (
                    <p className="text-xs text-red-500 mt-2">⚠️ Acima da média recomendada</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerList>
    </div>
  );
}
