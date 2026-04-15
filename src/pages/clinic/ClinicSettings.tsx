import {useEffect, useState} from "react";
import {useClinic, useUpsertClinic} from "@/hooks/useClinic";
import {useAuth} from "@/contexts/AuthContext";
import {useTheme} from "next-themes";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {toast} from "sonner";
import {Building2, HelpCircle, Keyboard, LogOut, Monitor, Moon, Sun,} from "lucide-react";
import {cn} from "@/lib/utils";

type SectionId = "clinic" | "appearance" | "system" | "account";

const NAV_GROUPS: {
  label: string;
  items: { id: SectionId; label: string; icon: React.ElementType; danger?: boolean }[];
}[] = [
  {
    label: "Clínica",
    items: [
      { id: "clinic", label: "Perfil da Clínica", icon: Building2 },
    ],
  },
  {
    label: "Preferências",
    items: [
      { id: "appearance", label: "Aparência", icon: Monitor  },
      { id: "system",     label: "Sistema",   icon: Keyboard },
    ],
  },
  {
    label: "Conta",
    items: [
      { id: "account", label: "Sair", icon: LogOut, danger: true },
    ],
  },
];

export default function ClinicSettings() {
  const { data: clinic, isLoading } = useClinic();
  const upsertClinic = useUpsertClinic();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SectionId>("clinic");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (clinic) {
      setName(clinic.name);
      setDescription(clinic.description ?? "");
    }
  }, [clinic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertClinic.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast.success("Clínica salva com sucesso!");
    } catch (err: unknown) {
      toast.error("Erro ao salvar", { description: (err as Error).message });
    }
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem("psigestao_onboarding_done");
    toast.success("Tour reiniciado! Recarregue a página para ver novamente.");
  };

  const themeOptions = [
    { value: "light",  label: "Claro",   icon: Sun     },
    { value: "dark",   label: "Escuro",  icon: Moon    },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie o perfil e as preferências da clínica</p>
      </div>

      <div className="flex gap-8 items-start">

        {/* ── Left sidebar nav ── */}
        <aside className="w-52 shrink-0 sticky top-6">
          <nav className="space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        item.danger
                          ? activeSection === item.id
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          : activeSection === item.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content area ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── PERFIL DA CLÍNICA ── */}
          {activeSection === "clinic" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {clinic ? "Perfil da Clínica" : "Criar Clínica"}
                    </CardTitle>
                    <CardDescription>
                      {clinic
                        ? "Informações de identificação da sua clínica"
                        : "Preencha os dados para criar sua clínica"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="clinic-name">Nome da clínica *</Label>
                    <Input
                      id="clinic-name"
                      placeholder="Clínica Bem-Estar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-desc">Descrição (opcional)</Label>
                    <Textarea
                      id="clinic-desc"
                      placeholder="Breve descrição da clínica..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={upsertClinic.isPending}>
                    {upsertClinic.isPending
                      ? "Salvando..."
                      : clinic ? "Salvar alterações" : "Criar clínica"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── APARÊNCIA ── */}
          {activeSection === "appearance" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Aparência</CardTitle>
                    <CardDescription>Escolha o tema visual do sistema</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 max-w-xs">
                  {themeOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={theme === opt.value ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setTheme(opt.value)}
                    >
                      <opt.icon className="mr-2 h-4 w-4" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── SISTEMA ── */}
          {activeSection === "system" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <HelpCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Tour do Sistema</CardTitle>
                      <CardDescription>Refaça o tour guiado pelas funcionalidades</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={handleResetOnboarding}>
                    Reiniciar tour
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Keyboard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Atalhos de Teclado</CardTitle>
                      <CardDescription>Navegue rapidamente pelo sistema</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm max-w-lg">
                    {[
                      { keys: "Ctrl + K", desc: "Busca global"      },
                      { keys: "Alt + D",  desc: "Dashboard"         },
                      { keys: "Alt + N",  desc: "Agenda"            },
                      { keys: "Alt + P",  desc: "Pacientes"         },
                      { keys: "Alt + U",  desc: "Psicólogas"        },
                    ].map((s) => (
                      <div key={s.keys} className="flex items-center justify-between rounded-lg border p-2.5">
                        <span className="text-muted-foreground">{s.desc}</span>
                        <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{s.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── CONTA / SAIR ── */}
          {activeSection === "account" && (
            <Card className="border-destructive/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-destructive">Sair da conta</CardTitle>
                    <CardDescription>Encerrar a sessão no sistema</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

