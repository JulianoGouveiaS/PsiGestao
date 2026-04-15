import {useCallback, useMemo, useState} from "react";
import {Calendar, dateFnsLocalizer, type Event, type SlotInfo, type View} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import {format, getDay, parse, startOfWeek} from "date-fns";
import {ptBR} from "date-fns/locale";
import {type Session, useSessions, useUpdateSession} from "@/hooks/useSessions";
import {useProfessionalSettings} from "@/hooks/useProfessionalSettings";
import {useRealtimeSubscription} from "@/hooks/useRealtimeSubscription";
import {SessionFormDialog} from "@/components/SessionFormDialog";
import {SessionDetailDialog} from "@/components/SessionDetailDialog";
import {AgendaCalendarToolbar} from "@/components/agenda/AgendaCalendarToolbar";
import {AgendaEvent} from "@/components/agenda/AgendaEvent";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";
import {cn} from "@/lib/utils";
import {toast} from "sonner";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "@/styles/agenda-calendar.css";

const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const calendarViews: View[] = ["week", "day", "month"];

const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarEvent extends Event {
  id: string;
  resource: Session;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "hsl(199, 89%, 38%)",
  completed: "hsl(160, 60%, 40%)",
  missed: "hsl(0, 72%, 51%)",
  cancelled: "hsl(215, 15%, 55%)",
  rescheduled: "hsl(270, 60%, 55%)",
};

function getEventColor(session: Session): string {
  return STATUS_COLORS[session.status] ?? STATUS_COLORS.scheduled;
}

const messages = {
  today: "Hoje",
  previous: "Anterior",
  next: "Próximo",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Lista",
  date: "Data",
  time: "Hora",
  event: "Sessão",
  noEventsInRange: "Nenhuma sessão neste período.",
  allDay: "Dia todo",
  work_week: "Semana útil",
};

export default function Agenda() {
  const { data: sessions, isLoading } = useSessions();
  const { data: professionalSettings } = useProfessionalSettings();
  const updateSession = useUpdateSession();

  useRealtimeSubscription("sessions", [["sessions"]]);
  useRealtimeSubscription("payments", [["payments"], ["sessions"]]);

  const [createOpen, setCreateOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  /** Status ocultos (rescheduled e cancelled escondidos por padrão) */
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(
    new Set(["rescheduled", "cancelled"])
  );

  const toggleStatus = useCallback((status: string) => {
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const selectedSession = useMemo(
    () => sessions?.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const events: CalendarEvent[] = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s) => !hiddenStatuses.has(s.status))
      .map((s) => {
        const durationMinutes = professionalSettings?.session_duration_minutes ?? 50;
        return {
          id: s.id,
          title: s.patients?.full_name ?? "Sessão",
          start: new Date(s.scheduled_at),
          end: new Date(new Date(s.scheduled_at).getTime() + durationMinutes * 60 * 1000),
          resource: s,
        };
      });
  }, [sessions, professionalSettings, hiddenStatuses]);

  const slotPropGetter = useCallback(
    (date: Date) => {
      if (!professionalSettings?.lunch_start || !professionalSettings?.lunch_end) return {};
      const [lsH, lsM] = professionalSettings.lunch_start.split(":").map(Number);
      const [leH, leM] = professionalSettings.lunch_end.split(":").map(Number);
      const h = date.getHours();
      const m = date.getMinutes();
      const slotMin = h * 60 + m;
      const lunchStartMin = lsH * 60 + (lsM || 0);
      const lunchEndMin = leH * 60 + (leM || 0);
      if (slotMin >= lunchStartMin && slotMin < lunchEndMin) {
        return { className: "rbc-lunch-slot" };
      }
      return {};
    },
    [professionalSettings],
  );

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    // Only open on actual click/selection, not on window focus events
    if (slotInfo.action === "click" || slotInfo.action === "doubleClick" || slotInfo.action === "select") {
      setDefaultDate(slotInfo.start as Date);
      setCreateOpen(true);
    }
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedSessionId(event.id);
    setDetailOpen(true);
  }, []);

  const handleEventDrop = useCallback(
    async (args: { event: CalendarEvent; start: Date | string }) => {
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
    [updateSession]
  );

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const bg = getEventColor(event.resource);
    return {
      style: {
        backgroundColor: bg,
        borderRadius: "6px",
        border: "none",
        color: "#fff",
        fontSize: "0.75rem",
        fontWeight: 500,
        padding: "2px 8px",
      },
    };
  }, []);

  // Visually dim columns for off-days based on working_days setting
  const dayPropGetter = useCallback(
    (date: Date) => {
      const workingDays = professionalSettings?.working_days ?? [1, 2, 3, 4, 5];
      const dayOfWeek = date.getDay(); // 0 = Sunday … 6 = Saturday
      if (!workingDays.includes(dayOfWeek)) {
        return { className: "rbc-off-day" };
      }
      return {};
    },
    [professionalSettings]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas sessões</p>
        </div>
        <Button onClick={() => { setDefaultDate(new Date()); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova sessão
        </Button>
      </div>

      {/* Filtro de status – mesmo padrão visual do painel clínica */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Status</span>
        {(
          [
            { status: "scheduled",   label: "Agendada",  dot: "bg-sky-600"     },
            { status: "completed",   label: "Realizada", dot: "bg-emerald-600" },
            { status: "missed",      label: "Falta",     dot: "bg-red-500"     },
            { status: "cancelled",   label: "Cancelada", dot: "bg-slate-400"   },
            { status: "rescheduled", label: "Remarcada", dot: "bg-violet-500"  },
          ] as const
        ).map(({ status, label, dot }) => {
          const hidden = hiddenStatuses.has(status);
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all",
                hidden
                  ? "border-transparent bg-secondary text-muted-foreground/50 line-through"
                  : "border-transparent bg-secondary text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", dot, hidden && "opacity-30")} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="calendar-wrapper min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card/80 p-3 shadow-sm">
        <DnDCalendar
          components={{ toolbar: AgendaCalendarToolbar, event: AgendaEvent }}
          localizer={localizer}
          events={events}
          defaultView="week"
          views={calendarViews}
          step={30}
          timeslots={2}
          selectable
          resizable={false}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           onEventDrop={handleEventDrop as any}
           eventPropGetter={eventStyleGetter}
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           slotPropGetter={slotPropGetter as any}
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           dayPropGetter={dayPropGetter as any}
          messages={messages}
          culture="pt-BR"
          min={new Date(0, 0, 0, professionalSettings?.calendar_start_hour ?? 7, 0)}
          max={new Date(0, 0, 0, professionalSettings?.calendar_end_hour ?? 22, 0)}
          style={{ height: "100%", minHeight: "100%" }}
        />
      </div>

      <SessionFormDialog open={createOpen} onOpenChange={setCreateOpen} defaultDate={defaultDate} />
      <SessionDetailDialog open={detailOpen} onOpenChange={setDetailOpen} session={selectedSession} />
    </div>
  );
}
