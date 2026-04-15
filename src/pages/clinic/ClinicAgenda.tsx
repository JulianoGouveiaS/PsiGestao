import {useCallback, useEffect, useMemo, useState} from "react";
import {Calendar, dateFnsLocalizer, type SlotInfo, type View} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import {addWeeks, format, getDay, isToday, parse, parseISO, startOfWeek} from "date-fns";
import {ptBR} from "date-fns/locale";
import {useClinicContext} from "@/contexts/ClinicContext";
import {type Session, useCreateSession, useSessions, useUpdateSession} from "@/hooks/useSessions";
import {useAllPatients} from "@/hooks/usePatients";
import {useActivePackage} from "@/hooks/usePackages";
import {useProfessionalSettings} from "@/hooks/useProfessionalSettings";
import {SessionDetailDialog} from "@/components/SessionDetailDialog";
import {AgendaCalendarToolbar} from "@/components/agenda/AgendaCalendarToolbar";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";
import {
    CalendarDays,
    CalendarPlus,
    CircleAlert,
    CircleCheck,
    CircleMinus,
    Clock,
    MapPin,
    Plus,
    Repeat,
    Video,
} from "lucide-react";
import {cn} from "@/lib/utils";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "@/styles/agenda-calendar.css";

// ─── Constants ───────────────────────────────────────────────────────────────

const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(Calendar);

/** One color per psychologist – cycles if there are more than 8 */
const PSYCH_COLORS = [
  "hsl(199,89%,38%)",  // azul
  "hsl(142,60%,35%)",  // verde
  "hsl(270,60%,50%)",  // roxo
  "hsl(25,90%,48%)",   // laranja
  "hsl(340,75%,48%)",  // rosa
  "hsl(180,65%,35%)",  // teal
  "hsl(300,60%,45%)",  // magenta
  "hsl(60,70%,38%)",   // amarelo-verde
];

const STATUS_OPACITY: Record<string, number> = {
  scheduled: 1,
  completed: 0.7,
  missed: 0.5,
  cancelled: 0.3,
  rescheduled: 0.3,
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  missed: "Falta",
  cancelled: "Cancelada",
  rescheduled: "Remarcada",
};

const messages = {
  today: "Hoje", previous: "Anterior", next: "Próximo",
  month: "Mês", week: "Semana", day: "Dia",
  date: "Data", time: "Hora", event: "Sessão",
  noEventsInRange: "Nenhuma sessão neste período.",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  title: string;       // patient name
  start: Date;
  end: Date;
  resource: Session;
  color: string;
  psychName: string;
  psychInitials: string;
}

// ─── Custom Event Component ───────────────────────────────────────────────────

function ClinicCalendarEvent({ event }: { event: CalEvent }) {
  const payment = event.resource?.payments?.[0];
  const paymentStatus: "paid" | "partial" | "pending" = payment?.status ?? "pending";
  const isOnline = event.resource?.modality === "online";

  const PayIcon =
    paymentStatus === "paid"
      ? CircleCheck
      : paymentStatus === "partial"
      ? CircleMinus
      : CircleAlert;

  const payColor =
    paymentStatus === "paid"
      ? "text-emerald-300"
      : paymentStatus === "partial"
      ? "text-amber-200"
      : "text-red-300";

  return (
    <div className="flex flex-col leading-tight h-full overflow-hidden px-0.5">
      <div className="flex items-center gap-1 min-w-0">
        <PayIcon className={cn("h-3 w-3 shrink-0", payColor)} />
        {isOnline && <Video className="h-2.5 w-2.5 shrink-0 text-white/70" />}
        <span className="truncate font-medium text-[0.72rem]">{event.title}</span>
      </div>
      <span className="truncate text-[0.63rem] text-white/65 mt-0.5">{event.psychName}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClinicAgenda() {
  const { members, selectedMember } = useClinicContext();
  const { data: allSessions = [] } = useSessions();
  const { data: allPatients = [] } = useAllPatients();
  const updateSession = useUpdateSession();
  const createSession = useCreateSession();
  const { data: professionalSettings } = useProfessionalSettings();

  const [view, setView] = useState<View>("week");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState<Date | null>(null);
  const [newPsychId, setNewPsychId] = useState("");
  const [newPatientId, setNewPatientId] = useState("");
  const [newPrice, setNewPrice] = useState("150");
  const [newModality, setNewModality] = useState<"presencial" | "online">("presencial");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newWeeks, setNewWeeks] = useState("4");

  const { data: activePackage } = useActivePackage(newPatientId || undefined);

  // Auto-fill price from active package or professional settings
  useEffect(() => {
    if (!createOpen) return;
    if (activePackage && newPatientId) {
      setNewPrice(String(activePackage.session_price));
      if (newRecurring) {
        const remaining = activePackage.total_sessions - activePackage.sessions_used;
        if (remaining > 0) setNewWeeks(String(remaining));
      }
    } else if (professionalSettings && newPatientId) {
      setNewPrice(String(professionalSettings.default_session_price));
    }
  }, [activePackage, newPatientId, newRecurring, professionalSettings, createOpen]);

  /** Active status filters (empty = all statuses visible) */
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set(["rescheduled", "cancelled"]));


  // ── Derived maps ────────────────────────────────────────────────────────────

  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((mem, i) => {
      m[mem.psychologist_user_id] = PSYCH_COLORS[i % PSYCH_COLORS.length];
    });
    return m;
  }, [members]);

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((mem) => {
      m[mem.psychologist_user_id] = mem.profiles?.full_name ?? "Psicóloga";
    });
    return m;
  }, [members]);

  /** Set of psychologist IDs for which the admin has manage_sessions permission */
  const manageableIds = useMemo(
    () => new Set(members.filter((m) => m.permissions.manage_sessions).map((m) => m.psychologist_user_id)),
    [members],
  );

  /** Members available for session creation (manage_sessions required) */
  const manageableMembers = useMemo(
    () => members.filter((m) => m.permissions.manage_sessions),
    [members],
  );

  const canManageForPsych = useCallback(
    (userId: string) => manageableIds.has(userId),
    [manageableIds],
  );

  // ── Filter logic ─────────────────────────────────────────────────────────────

  // Derived from the global header switcher (selectedMember from context)
  const visiblePsychIds = useMemo(
    () =>
      selectedMember
        ? new Set([selectedMember.psychologist_user_id])
        : new Set(members.map((m) => m.psychologist_user_id)),
    [selectedMember, members],
  );

  const toggleStatus = useCallback((status: string) => {
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  // ── Build calendar events ────────────────────────────────────────────────────

  const events: CalEvent[] = useMemo(() => {
    const durationMs = (professionalSettings?.session_duration_minutes ?? 50) * 60 * 1000;
    return allSessions
      .filter(
        (s) =>
          visiblePsychIds.has(s.user_id) &&
          !hiddenStatuses.has(s.status),
      )
      .map((s) => {
        const psychName = nameMap[s.user_id] ?? "Psicóloga";
        const initials = psychName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
        return {
          id: s.id,
          title: s.patients?.full_name ?? "Sessão",
          start: new Date(s.scheduled_at),
          end: new Date(new Date(s.scheduled_at).getTime() + durationMs),
          resource: s,
          color: colorMap[s.user_id] ?? PSYCH_COLORS[0],
          psychName,
          psychInitials: initials,
        };
      });
  }, [allSessions, visiblePsychIds, hiddenStatuses, professionalSettings, colorMap, nameMap]);

  const selectedSession = useMemo(
    () => allSessions.find((s) => s.id === selectedSessionId) ?? null,
    [allSessions, selectedSessionId],
  );

  // ── Stats ────────────────────────────────────────────────────────────────────

  const todayCount = useMemo(
    () =>
      allSessions.filter(
        (s) =>
          visiblePsychIds.has(s.user_id) &&
          isToday(parseISO(s.scheduled_at)) &&
          s.status !== "rescheduled" &&
          s.status !== "cancelled",
      ).length,
    [allSessions, visiblePsychIds],
  );

  const weeksNum = Math.max(1, Math.min(52, parseInt(newWeeks) || 1));

  const previewDates = newSessionDate
    ? Array.from({ length: newRecurring ? weeksNum : 1 }, (_, i) =>
        addWeeks(newSessionDate, i)
      )
    : [];

  const remainingSessions = activePackage
    ? activePackage.total_sessions - activePackage.sessions_used
    : null;

  const willExceedPackage = remainingSessions !== null && previewDates.length > remainingSessions;

  // ── Event handlers ────────────────────────────────────────────────────────────

  const eventPropGetter = useCallback(
    (event: CalEvent) => ({
      style: {
        backgroundColor: event.color,
        opacity: STATUS_OPACITY[event.resource.status] ?? 1,
        borderRadius: "6px",
        border: "none",
        color: "#fff",
        fontSize: "0.75rem",
        fontWeight: 500,
        padding: "2px 6px",
      },
    }),
    [],
  );

  const handleEventDrop = useCallback(
    async (args: { event: CalEvent; start: Date | string }) => {
      if (!canManageForPsych(args.event.resource.user_id)) {
        toast.error("Sem permissão", {
          description: "Você não tem permissão para editar sessões desta psicóloga.",
        });
        return;
      }
      try {
        await updateSession.mutateAsync({
          id: args.event.id,
          scheduled_at: new Date(args.start).toISOString(),
        });
        toast.success("Sessão reagendada!");
      } catch (err: unknown) {
        toast.error("Erro ao mover", { description: (err as Error).message });
      }
    },
    [updateSession, canManageForPsych],
  );

  const handleSelectEvent = useCallback((ev: CalEvent) => {
    setSelectedSessionId(ev.id);
    setDetailOpen(true);
  }, []);

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (slotInfo.action !== "click" && slotInfo.action !== "select") return;
      if (manageableIds.size === 0) {
        toast.error("Sem permissão", {
          description: "Você não tem permissão para criar sessões para nenhuma psicóloga.",
        });
        return;
      }
      // Use the globally-selected psychologist if manageable, otherwise fall back to first manageable
      const defaultPsych =
        selectedMember && manageableIds.has(selectedMember.psychologist_user_id)
          ? selectedMember.psychologist_user_id
          : manageableMembers[0]?.psychologist_user_id ?? "";
      setNewSessionDate(slotInfo.start as Date);
      setNewPsychId(defaultPsych);
      setNewPatientId("");
      setNewPrice("150");
      setNewModality("presencial");
      setNewRecurring(false);
      setNewWeeks("4");
      setCreateOpen(true);
    },
    [selectedMember, manageableIds, manageableMembers],
  );

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPsychId || !newPatientId || !newSessionDate) return;

    if (willExceedPackage) {
      toast.error("Pacote insuficiente", {
        description: `O pacote tem apenas ${remainingSessions} sessão(ões) restante(s), mas você está tentando agendar ${previewDates.length}.`,
      });
      return;
    }

    try {
      const seriesId = newRecurring && previewDates.length > 1
        ? crypto.randomUUID()
        : undefined;

      for (const date of previewDates) {
        await createSession.mutateAsync({
          patient_id: newPatientId,
          scheduled_at: date.toISOString(),
          price: parseFloat(newPrice),
          modality: newModality,
          meeting_url: null,
          user_id_override: newPsychId || undefined,
          ...(seriesId ? { series_id: seriesId } as any : {}),
        });
      }
      toast.success(
        previewDates.length > 1
          ? `${previewDates.length} sessões agendadas com sucesso!`
          : "Sessão agendada com sucesso!"
      );
      setCreateOpen(false);
    } catch (err: unknown) {
      toast.error("Erro ao agendar", { description: (err as Error).message });
    }
  };

  const filteredPatients = useMemo(
    () =>
      newPsychId
        ? allPatients.filter((p) => p.user_id === newPsychId && p.status === "active")
        : allPatients,
    [allPatients, newPsychId],
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-0 flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Gerencie as sessões da clínica</span>
            {todayCount > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-primary font-medium">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {todayCount} sessões hoje
                </span>
              </>
            )}
          </p>
        </div>
        <Button
          onClick={() => {
            if (manageableIds.size === 0) return;
            const defaultPsych =
              selectedMember && manageableIds.has(selectedMember.psychologist_user_id)
                ? selectedMember.psychologist_user_id
                : manageableMembers[0]?.psychologist_user_id ?? "";
            setNewSessionDate(new Date());
            setNewPsychId(defaultPsych);
            setNewPatientId("");
            setNewPrice("150");
            setNewModality("presencial");
            setNewRecurring(false);
            setNewWeeks("4");
            setCreateOpen(true);
          }}
          disabled={manageableIds.size === 0}
          title={manageableIds.size === 0 ? "Sem permissão para criar sessões" : undefined}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova sessão
        </Button>
      </div>

      {/* ── Filtro de status ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <span className="text-xs text-muted-foreground font-medium shrink-0">Status</span>
          {Object.entries(STATUS_LABELS)
            .filter(([s]) => s !== "rescheduled")
            .map(([status, label]) => {
              const hidden = hiddenStatuses.has(status);
              const dotColors: Record<string, string> = {
                scheduled: "bg-sky-600",
                completed: "bg-emerald-600",
                missed: "bg-red-500",
                cancelled: "bg-slate-400",
              };
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium border transition-all",
                    hidden
                      ? "bg-secondary text-muted-foreground/50 border-transparent line-through"
                      : "bg-secondary text-muted-foreground border-transparent hover:border-border hover:text-foreground",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full shrink-0", dotColors[status], hidden && "opacity-30")} />
                  {label}
                </button>
              );
            })}
      </div>

      {/* Calendar */}
      <div className="calendar-wrapper min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card/80 p-3 shadow-sm">
        <DnDCalendar
          components={{
            toolbar: AgendaCalendarToolbar,
            event: ClinicCalendarEvent as any,
          }}
          localizer={localizer}
          events={events}
          defaultView="week"
          views={["week", "day", "month"]}
          view={view}
          onView={setView}
          step={30}
          timeslots={2}
          selectable={manageableIds.size > 0}
          resizable={false}
          draggableAccessor={(ev) => canManageForPsych((ev as CalEvent).resource.user_id)}
          onSelectEvent={(ev) => handleSelectEvent(ev as CalEvent)}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop as any}
          eventPropGetter={eventPropGetter as any}
          messages={messages}
          culture="pt-BR"
          min={new Date(0, 0, 0, professionalSettings?.calendar_start_hour ?? 7, 0)}
          max={new Date(0, 0, 0, professionalSettings?.calendar_end_hour ?? 22, 0)}
          style={{ height: "100%", minHeight: "100%" }}
        />
      </div>

      {/* Session detail */}
      <SessionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={selectedSession}
        canManageSessions={selectedSession ? canManageForPsych(selectedSession.user_id) : true}
      />

      {/* Create session dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Nova Sessão
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4">

            {/* Psicóloga */}
            <div className="space-y-2">
              <Label>Psicóloga *</Label>
              <Select value={newPsychId} onValueChange={(v) => { setNewPsychId(v); setNewPatientId(""); }} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a psicóloga" />
                </SelectTrigger>
                <SelectContent>
                  {manageableMembers.map((m) => {
                    const color = colorMap[m.psychologist_user_id];
                    return (
                      <SelectItem key={m.psychologist_user_id} value={m.psychologist_user_id}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {m.profiles?.full_name ?? "Psicóloga"}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Paciente */}
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={newPatientId} onValueChange={setNewPatientId} required disabled={!newPsychId}>
                <SelectTrigger>
                  <SelectValue placeholder={newPsychId ? "Selecione o paciente" : "Selecione a psicóloga primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPatients.length === 0 ? (
                    <div className="py-2 px-3 text-xs text-muted-foreground">Nenhum paciente ativo</div>
                  ) : (
                    filteredPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Data e hora */}
            <div className="space-y-2">
              <Label>Data e hora *</Label>
              <Input
                type="datetime-local"
                value={newSessionDate ? format(newSessionDate, "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => setNewSessionDate(e.target.value ? new Date(e.target.value) : null)}
                required
              />
            </div>

            {/* Recurring toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Sessão recorrente</p>
                  <p className="text-xs text-muted-foreground">Repetir semanalmente</p>
                </div>
              </div>
              <Switch checked={newRecurring} onCheckedChange={setNewRecurring} />
            </div>

            {newRecurring && (
              <div className="space-y-3 rounded-lg border border-dashed p-3">
                <div className="space-y-2">
                  <Label>Repetir por quantas semanas?</Label>
                  <Input
                    type="number"
                    min="1"
                    max="52"
                    value={newWeeks}
                    onChange={(e) => setNewWeeks(e.target.value)}
                  />
                </div>

                {newSessionDate && previewDates.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {previewDates.length} sessão(ões) serão criadas:
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {previewDates.map((d, i) => (
                        <p key={i} className="text-xs text-foreground flex items-center gap-1">
                          <CalendarPlus className="h-3 w-3 text-primary" />
                          {format(d, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {willExceedPackage && (
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ O pacote possui apenas {remainingSessions} sessão(ões) restante(s).
                    Reduza para {remainingSessions} semanas ou ajuste o pacote.
                  </p>
                )}
              </div>
            )}

            {/* Modalidade */}
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["presencial", "online"] as const).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setNewModality(mod)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border-2 py-2 text-sm font-medium transition-colors",
                      newModality === mod
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground",
                    )}
                  >
                    {mod === "presencial" ? <MapPin className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    {mod === "presencial" ? "Presencial" : "Online"}
                  </button>
                ))}
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              {activePackage && (
                <p className="text-xs text-muted-foreground">
                  Pacote ativo: {activePackage.name} — {activePackage.sessions_used}/{activePackage.total_sessions} sessões usadas
                </p>
              )}
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="150.00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createSession.isPending || !newPsychId || !newPatientId}>
                {createSession.isPending
                  ? "Salvando..."
                  : newRecurring
                  ? `Agendar ${previewDates.length} sessões`
                  : "Agendar sessão"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



