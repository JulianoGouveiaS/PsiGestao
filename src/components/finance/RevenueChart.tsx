import {useMemo} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {endOfMonth, format, isWithinInterval, startOfMonth, subMonths} from "date-fns";
import {ptBR} from "date-fns/locale";
import type {Session} from "@/hooks/useSessions";

interface RevenueChartProps {
  sessions: Session[];
  monthsBack?: number;
}

export function RevenueChart({ sessions, monthsBack = 6 }: RevenueChartProps) {
  const chartData = useMemo(() => {
    const data = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const ref = subMonths(new Date(), i);
      const start = startOfMonth(ref);
      const end = endOfMonth(ref);
      const label = format(ref, "MMM yy", { locale: ptBR });

      let received = 0;
      let pending = 0;

      sessions.forEach((s) => {
        if (s.status === "rescheduled") return;
        if (!isWithinInterval(new Date(s.scheduled_at), { start, end })) return;
        const p = s.payments?.[0];
        if (p) {
          received += Number(p.amount_paid);
          pending += Number(p.total_amount) - Number(p.amount_paid);
        } else {
          pending += Number(s.price);
        }
      });

      data.push({ month: label, received: +received.toFixed(2), pending: +pending.toFixed(2) });
    }
    return data;
  }, [sessions, monthsBack]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Receita Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
            <Tooltip
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend />
            <Bar dataKey="received" name="Recebido" fill="hsl(160, 60%, 40%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" name="Pendente" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
