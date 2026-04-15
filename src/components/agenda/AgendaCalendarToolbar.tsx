import type {ToolbarProps, View} from "react-big-calendar";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {ChevronLeft, ChevronRight} from "lucide-react";

const VIEW_LABELS: Partial<Record<View, string>> = {
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Lista",
};

function getAvailableViews<TEvent extends object, TResource extends object>(
  views: ToolbarProps<TEvent, TResource>["views"]
): View[] {
  if (Array.isArray(views)) return views;

  return Object.entries(views)
    .filter(([, enabled]) => enabled)
    .map(([viewName]) => viewName as View);
}

export function AgendaCalendarToolbar<TEvent extends object, TResource extends object>({
  label,
  onNavigate,
  onView,
  view,
  views,
}: ToolbarProps<TEvent, TResource>) {
  const availableViews = getAvailableViews(views);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary p-1">
          <Button className="h-9 rounded-lg px-4" size="sm" variant="ghost" onClick={() => onNavigate("TODAY")}>
            Hoje
          </Button>
          <Button
            aria-label="Período anterior"
            className="h-9 w-9 rounded-lg p-0"
            size="icon"
            variant="ghost"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Próximo período"
            className="h-9 w-9 rounded-lg p-0"
            size="icon"
            variant="ghost"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold tracking-tight text-foreground sm:min-w-56 sm:text-center">
          {label}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-secondary p-1">
        {availableViews.map((availableView) => {
          const active = view === availableView;

          return (
            <Button
              key={availableView}
              className={cn(
                "h-9 rounded-lg px-4 text-sm",
                !active && "text-muted-foreground hover:text-foreground"
              )}
              size="sm"
              variant={active ? "default" : "ghost"}
              onClick={() => onView(availableView)}
            >
              {VIEW_LABELS[availableView] ?? availableView}
            </Button>
          );
        })}
      </div>
    </div>
  );
}