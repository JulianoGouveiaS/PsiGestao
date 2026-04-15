import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {useAllPatients} from "@/hooks/usePatients";
import {useSessions} from "@/hooks/useSessions";
import {usePackages} from "@/hooks/usePackages";
import {
    Archive,
    Calendar,
    CalendarDays,
    DollarSign,
    LayoutDashboard,
    PackageIcon,
    Settings,
    User,
    Users,
} from "lucide-react";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";

const pages = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Agenda", path: "/agenda", icon: Calendar },
  { name: "Pacientes", path: "/patients", icon: Users },
  { name: "Pacotes", path: "/packages", icon: PackageIcon },
  { name: "Financeiro", path: "/finances", icon: DollarSign },
  { name: "Configurações", path: "/settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: patients = [] } = useAllPatients(query || undefined);
  const { data: sessions = [] } = useSessions();
  const { data: packages = [] } = usePackages();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  // Filter sessions by patient name or date
  const filteredSessions = useMemo(() => {
    if (!query) return sessions.slice(0, 5);
    const q = query.toLowerCase();
    return sessions
      .filter(
        (s) =>
          s.patients?.full_name?.toLowerCase().includes(q) ||
          format(new Date(s.scheduled_at), "dd/MM/yyyy").includes(q)
      )
      .slice(0, 5);
  }, [sessions, query]);

  // Filter packages
  const filteredPackages = useMemo(() => {
    if (!query) return packages.slice(0, 5);
    const q = query.toLowerCase();
    return packages
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.patients?.full_name?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [packages, query]);

  const filteredPatients = patients.slice(0, 8);

  return (
    <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <CommandInput
        placeholder="Buscar pacientes, sessões, pacotes..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {pages.map((p) => (
            <CommandItem key={p.path} onSelect={() => go(p.path)}>
              <p.icon className="mr-2 h-4 w-4" />
              {p.name}
            </CommandItem>
          ))}
        </CommandGroup>
        {filteredPatients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pacientes">
              {filteredPatients.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/patients/${p.id}`)}>
                  <User className="mr-2 h-4 w-4" />
                  {p.full_name}
                  {p.email && <span className="ml-2 text-xs text-muted-foreground">{p.email}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {filteredSessions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sessões recentes">
              {filteredSessions.map((s) => (
                <CommandItem key={s.id} onSelect={() => go("/agenda")}>
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{s.patients?.full_name ?? "—"}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {format(new Date(s.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {filteredPackages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pacotes">
              {filteredPackages.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/patients/${p.patient_id}`)}>
                  <Archive className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{p.name || "Pacote"}</span>
                  {p.patients?.full_name && (
                    <span className="ml-2 text-xs text-muted-foreground">{p.patients.full_name}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
