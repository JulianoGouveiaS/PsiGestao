import {NavLink} from "react-router-dom";
import type {Clinic} from "@/hooks/useClinic";
import {cn} from "@/lib/utils";
import {Building2, CalendarDays, LayoutDashboard, Settings, UserRound, Users,} from "lucide-react";

const NAV = [
  { to: "/clinic/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { to: "/clinic/agenda",        label: "Agenda",        icon: CalendarDays },
  { to: "/clinic/patients",      label: "Pacientes",     icon: UserRound },
  { to: "/clinic/psychologists", label: "Psicólogas",    icon: Users },
  { to: "/clinic/settings",      label: "Configurações", icon: Settings },
];

interface Props {
  clinic: Clinic | null | undefined;
}

export function ClinicSidebar({ clinic }: Props) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">

      {/* Logo / Clinic name */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {clinic?.name ?? "Minha Clínica"}
          </p>
          <p className="text-xs text-muted-foreground">Painel Admin</p>
        </div>
      </div>

      {/* Navegação principal */}
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Menu
        </p>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
