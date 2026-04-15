import {useState} from "react";
import {type TimelineItem, usePatientTimeline} from "@/hooks/usePatientTimeline";
import {SessionViewDialog} from "@/components/SessionViewDialog";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";
import {CalendarDays, DollarSign, FileText} from "lucide-react";

const typeConfig: Record<TimelineItem["type"], { icon: typeof CalendarDays; color: string }> = {
  session: { icon: CalendarDays, color: "bg-blue-100 text-blue-700" },
  payment: { icon: DollarSign, color: "bg-emerald-100 text-emerald-700" },
  note: { icon: FileText, color: "bg-amber-100 text-amber-700" },
};

export function PatientTimeline({ patientId }: { patientId: string }) {
  const { data: items, isLoading } = usePatientTimeline(patientId);
  const [selectedSession, setSelectedSession] = useState<{ id: string; scheduled_at: string; status: string; price: number; modality?: string } | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum registro encontrado ainda.
      </p>
    );
  }

  const handleItemClick = (item: TimelineItem) => {
    if (item.type !== "session") return;
    // Extract session id from "session-{uuid}"
    const sessionId = item.id.replace("session-", "");
    setSelectedSession({
      id: sessionId,
      scheduled_at: item.date,
      status: item.meta?.status ?? "scheduled",
      price: parseFloat(item.description.replace("R$ ", "").replace(",", ".")) || 0,
      modality: item.meta?.modality,
    });
    setViewOpen(true);
  };

  return (
    <>
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

        {items.map((item) => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          const isSession = item.type === "session";

          return (
            <div
              key={item.id}
              className={`relative flex gap-4 pb-6 last:pb-0 ${isSession ? "cursor-pointer rounded-lg transition-colors hover:bg-muted/50 -mx-2 px-2 py-1" : ""}`}
              onClick={() => handleItemClick(item)}
            >
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <SessionViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        session={selectedSession}
      />
    </>
  );
}
