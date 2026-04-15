import {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {ClinicProvider, useClinicContext} from "@/contexts/ClinicContext";
import {useClinic} from "@/hooks/useClinic";
import {useClinicMembers} from "@/hooks/useClinicMembers";
import {ClinicSidebar} from "./ClinicSidebar";
import {PsychologistSwitcher} from "./PsychologistSwitcher";
import {ThemeToggle} from "@/components/ThemeToggle";
import {useAuth} from "@/contexts/AuthContext";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {LogOut} from "lucide-react";

function ClinicLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { data: clinic } = useClinic();
  const { data: members = [] } = useClinicMembers(clinic?.id);
  const { setMembers } = useClinicContext();
  const navigate = useNavigate();

  const membersKey = members.map((m) => m.id).join(",");
  useEffect(() => {
    setMembers(members);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersKey]);

  useEffect(() => {
    if (clinic === null) {
      navigate("/clinic/settings");
    }
  }, [clinic, navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <ClinicSidebar clinic={clinic} />
      <main className="flex min-w-0 flex-1 flex-col">
        {/* ── Header global ── */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          {/* Esquerda: seletor de psicóloga (contexto global) */}
          <PsychologistSwitcher />

          {/* Direita: ações do usuário */}
          <div className="flex items-center gap-1">
            <span className="hidden text-xs text-muted-foreground sm:inline mr-1">
              {user?.email}
            </span>
            <Separator orientation="vertical" className="mx-1 h-4 hidden sm:block" />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-8 gap-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        {/* ── Conteúdo da página ── */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}

export function ClinicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClinicProvider>
      <ClinicLayoutInner>{children}</ClinicLayoutInner>
    </ClinicProvider>
  );
}

