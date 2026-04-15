import {useMemo} from "react";
import {useNavigate} from "react-router-dom";
import {useClinicContext} from "@/contexts/ClinicContext";
import {useSessions} from "@/hooks/useSessions";
import {useAllPatients} from "@/hooks/usePatients";
import {usePayments} from "@/hooks/usePayments";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {AlertCircle, CalendarCheck, Clock, MapPin, TrendingUp, Users, Video,} from "lucide-react";
import {endOfMonth, format, isToday, isWithinInterval, parseISO, startOfMonth} from "date-fns";
import {ptBR} from "date-fns/locale";

export default function ClinicDashboard() {
  const { members, selectedMember } = useClinicContext();
  const navigate = useNavigate();

  // Fetch data for all managed psychologists
  const { data: allSessions = [] } = useSessions();
  const { data: allPatients = [] } = useAllPatients();
  const { data: allPayments = [] } = usePayments();

  const now = new Date();
  const ms = startOfMonth(now);
  const me = endOfMonth(now);

  // Filter by selected psychologist if any
  const filterBySelected = <T extends { user_id: string }>(arr: T[]) => {
    if (!selectedMember) return arr;
    return arr.filter((x) => x.user_id === selectedMember.psychologist_user_id);
  };

  const sessions = filterBySelected(allSessions);
  const patients = filterBySelected(allPatients);
  const payments = filterBySelected(allPayments);

  const todaySessions = useMemo(
    () => sessions.filter((s) => isToday(parseISO(s.scheduled_at)) && s.status !== "rescheduled"),
    [sessions],
  );

  const monthRevenue = useMemo(
    () =>
      payments
        .filter((p) => isWithinInterval(parseISO(p.created_at), { start: ms, end: me }))
        .reduce((sum, p) => sum + Number(p.amount_paid), 0),
    [payments],
  );

  const totalPending = useMemo(
    () =>
      payments
        .filter((p) => p.status !== "paid")
        .reduce((sum, p) => sum + (Number(p.total_amount) - Number(p.amount_paid)), 0),
    [payments],
  );

  const activePatients = patients.filter((p) => p.status === "active").length;

  /** Per-psychologist stats card */
  const psychologistCards = useMemo(() => {
    return members.map((m) => {
      const uid = m.psychologist_user_id;
      const todayCount = allSessions.filter(
        (s) => s.user_id === uid && isToday(parseISO(s.scheduled_at)) && s.status !== "rescheduled",
      ).length;
      const rev = allPayments
        .filter(
          (p) =>
            p.user_id === uid &&
            isWithinInterval(parseISO(p.created_at), { start: ms, end: me }),
        )
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      const pts = allPatients.filter((p) => p.user_id === uid && p.status === "active").length;

      const name = m.profiles?.full_name ?? "Psicóloga";
      const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

      return { m, name, initials, todayCount, rev, pts };
    });
  }, [members, allSessions, allPayments, allPatients]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          {selectedMember && (
            <span className="ml-2 text-primary font-medium">
              — {selectedMember.profiles?.full_name}
            </span>
          )}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sessões Hoje</CardTitle>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todaySessions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pacientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activePatients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Receita do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">R$ {monthRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pendente</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">R$ {totalPending.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-psychologist overview (shown when "Todas" is selected) */}
      {!selectedMember && psychologistCards.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Psicólogas</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {psychologistCards.map(({ m, name, initials, todayCount, rev, pts }) => (
              <Card
                key={m.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/clinic/agenda")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{pts} pacientes ativos</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold">{todayCount}</p>
                      <p className="text-xs text-muted-foreground">sessões hoje</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold text-emerald-600">R$ {rev.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">este mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Today's sessions */}
      {todaySessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Sessões Hoje</h2>
          <div className="grid gap-2">
            {todaySessions.map((s) => {
              const psych = members.find((m) => m.psychologist_user_id === s.user_id);
              return (
                <Card key={s.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate("/clinic/agenda")}>
                  <CardContent className="flex items-center gap-4 p-3">
                    {s.modality === "online" ? (
                      <Video className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.patients?.full_name ?? "Paciente"}
                      </p>
                      {!selectedMember && psych && (
                        <p className="text-xs text-muted-foreground truncate">
                          {psych.profiles?.full_name ?? "Psicóloga"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(s.scheduled_at), "HH:mm")}
                    </div>
                    <Badge
                      variant="outline"
                      className={s.status === "completed" ? "text-emerald-600" : "text-blue-600"}
                    >
                      {s.status === "scheduled" ? "Agendada" : "Realizada"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

