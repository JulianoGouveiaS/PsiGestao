import {useMemo, useState} from "react";
import {Bell} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {useSessions} from "@/hooks/useSessions";
import {usePayments} from "@/hooks/usePayments";
import {useAllPatients} from "@/hooks/usePatients";
import {getDate, getMonth, isToday, parseISO} from "date-fns";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: sessions = [] } = useSessions();
  const { data: payments = [] } = usePayments();
  const { data: patients = [] } = useAllPatients();

  const notifications = useMemo(() => {
    const items: { id: string; text: string; type: "info" | "warning" | "success" }[] = [];

    const todayCount = sessions.filter(
      (s) => isToday(parseISO(s.scheduled_at)) && s.status === "scheduled"
    ).length;
    if (todayCount > 0) {
      items.push({ id: "today", text: `Você tem ${todayCount} sessão(ões) hoje`, type: "info" });
    }

    const pendingCount = payments.filter((p) => p.status === "pending").length;
    if (pendingCount > 0) {
      items.push({ id: "pending", text: `${pendingCount} pagamento(s) pendente(s)`, type: "warning" });
    }

    const now = new Date();
    const birthdayToday = patients.filter((p) => {
      if (!p.birth_date) return false;
      const d = parseISO(p.birth_date);
      return getMonth(d) === getMonth(now) && getDate(d) === getDate(now);
    });
    birthdayToday.forEach((p) => {
      items.push({ id: `bday-${p.id}`, text: `🎂 ${p.full_name} faz aniversário hoje!`, type: "success" });
    });

    return items;
  }, [sessions, payments, patients]);

  const count = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <h4 className="font-semibold text-sm mb-3">Notificações</h4>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma notificação</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2 rounded-lg border p-2.5 text-sm"
              >
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    n.type === "warning"
                      ? "bg-amber-500"
                      : n.type === "success"
                      ? "bg-emerald-500"
                      : "bg-primary"
                  }`}
                />
                <span className="text-foreground">{n.text}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
