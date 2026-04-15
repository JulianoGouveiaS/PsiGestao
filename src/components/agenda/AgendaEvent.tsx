import type {EventProps} from "react-big-calendar";
import {CircleAlert, CircleCheck, CircleMinus, Video} from "lucide-react";

const paymentIcons = {
  paid: CircleCheck,
  partial: CircleMinus,
  pending: CircleAlert,
} as const;

const paymentColors = {
  paid: "text-emerald-300",
  partial: "text-amber-200",
  pending: "text-red-300",
} as const;

export function AgendaEvent({ event }: EventProps<any>) {
  const payment = event.resource?.payments?.[0];
  const paymentStatus: "paid" | "partial" | "pending" = payment?.status ?? "pending";
  const Icon = paymentIcons[paymentStatus];
  const iconColor = paymentColors[paymentStatus];
  const isOnline = event.resource?.modality === "online";

  return (
    <div className="flex items-center gap-1.5 truncate leading-tight">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
      {isOnline && <Video className="h-3 w-3 shrink-0 text-white/70" />}
      <span className="truncate">{event.title}</span>
    </div>
  );
}
