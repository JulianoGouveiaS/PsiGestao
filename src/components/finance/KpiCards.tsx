import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {AlertCircle, CheckCircle2, DollarSign, TrendingUp} from "lucide-react";

interface KpiCardsProps {
  totalReceived: number;
  totalPending: number;
  sessionsCount: number;
  paidCount: number;
  avgTicket: number;
}

export function KpiCards({ totalReceived, totalPending, sessionsCount, paidCount, avgTicket }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total Recebido</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-emerald-600">R$ {totalReceived.toFixed(2)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total Pendente</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-red-600">R$ {totalPending.toFixed(2)}</p>
          {totalPending > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Você tem R$ {totalPending.toFixed(2)} pendente
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Sessões</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-foreground">{sessionsCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Pagos</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-foreground">
            {paidCount}
            <span className="text-sm font-normal text-muted-foreground ml-1">/ {sessionsCount}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Médio</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-foreground">R$ {avgTicket.toFixed(2)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
