import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {CalendarDays, CalendarRange} from "lucide-react";

interface ForecastCardsProps {
  week: number;
  month: number;
  weekSessions: number;
  monthSessions: number;
}

export function ForecastCards({ week, month, weekSessions, monthSessions }: ForecastCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Previsão da Semana</CardTitle>
          <CalendarDays className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">R$ {week.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {weekSessions} sessão{weekSessions !== 1 ? "ões" : ""} agendada{weekSessions !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Previsão do Mês</CardTitle>
          <CalendarRange className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">R$ {month.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {monthSessions} sessão{monthSessions !== 1 ? "ões" : ""} agendada{monthSessions !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
