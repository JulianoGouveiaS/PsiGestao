import {useEffect, useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {useAuth} from "@/contexts/AuthContext";
import {supabase} from "@/integrations/supabase/client";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {
    Building2,
    Calendar,
    Clock,
    DollarSign,
    Eye,
    EyeOff,
    HelpCircle,
    Keyboard,
    KeyRound,
    LogOut,
    Monitor,
    Moon,
    SlidersHorizontal,
    Sun,
    User,
} from "lucide-react";
import {useTheme} from "next-themes";
import {useProfessionalSettings, useUpsertProfessionalSettings} from "@/hooks/useProfessionalSettings";
import {useDisconnectFromClinic, useMyClinicMemberships, useUpdateMemberPermissions} from "@/hooks/useClinicMembers";
import type {ClinicPermissions} from "@/hooks/useClinicInvites";
import {cn} from "@/lib/utils";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type SectionId = "profile" | "professional" | "clinics" | "appearance" | "system" | "account";

const NAV_GROUPS: {
  label: string;
  items: { id: SectionId; label: string; icon: React.ElementType; danger?: boolean }[];
}[] = [
  {
    label: "Geral",
    items: [
      { id: "profile",      label: "Perfil",                  icon: User              },
      { id: "professional", label: "Config. Profissional",    icon: SlidersHorizontal },
      { id: "clinics",      label: "Clínicas",                icon: Building2         },
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

export default function Settings() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: settings } = useProfessionalSettings();
  const upsertSettings = useUpsertProfessionalSettings();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [defaultPrice, setDefaultPrice] = useState("150");
  const [sessionDuration, setSessionDuration] = useState("50");
  const [calendarStart, setCalendarStart] = useState("7");
  const [calendarEnd, setCalendarEnd] = useState("22");
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setDefaultPrice(String(settings.default_session_price));
      setSessionDuration(String(settings.session_duration_minutes));
      setCalendarStart(String(settings.calendar_start_hour));
      setCalendarEnd(String(settings.calendar_end_hour));
      setLunchStart(settings.lunch_start ?? "12:00");
      setLunchEnd(settings.lunch_end ?? "13:00");
      setWorkingDays(settings.working_days);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };


  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Erro ao alterar senha", { description: error.message });
    } else {
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await upsertSettings.mutateAsync({
        default_session_price: parseFloat(defaultPrice) || 150,
        session_duration_minutes: parseInt(sessionDuration) || 50,
        calendar_start_hour: parseInt(calendarStart) || 7,
        calendar_end_hour: parseInt(calendarEnd) || 22,
        lunch_start: lunchStart || null,
        lunch_end: lunchEnd || null,
        working_days: workingDays,
      });
      toast.success("Configurações profissionais salvas!");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  };

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const { data: memberships = [] } = useMyClinicMemberships();
  const updatePermissions = useUpdateMemberPermissions();
  const disconnectFromClinic = useDisconnectFromClinic();

  const handleTogglePermission = async (
    memberId: string,
    currentPerms: ClinicPermissions,
    key: keyof ClinicPermissions,
  ) => {
    const updated = { ...currentPerms, [key]: !currentPerms[key] };
    try {
      await updatePermissions.mutateAsync({ memberId, permissions: updated });
      toast.success("Permissão atualizada");
    } catch (err: unknown) {
      toast.error("Erro", { description: (err as Error).message });
    }
  };

  const handleDisconnect = async (memberId: string, clinicName: string) => {
    try {
      await disconnectFromClinic.mutateAsync(memberId);
      toast.success(`Desconectado de ${clinicName}`);
    } catch (err: unknown) {
      toast.error("Erro", { description: (err as Error).message });
    }
  };

  const permLabels: Record<keyof ClinicPermissions, string> = {
    view_agenda:      "Ver agenda",
    manage_sessions:  "Gerenciar sessões",
    view_patients:    "Ver pacientes",
    manage_patients:  "Gerenciar pacientes",
    view_finances:    "Ver finanças",
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu perfil e preferências</p>
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
                  {group.items.map((item) => {
                    // Hide "Clínicas" when not linked to any clinic
                    if (item.id === "clinics" && memberships.length === 0) return null;
                    return (
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
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content area ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── PERFIL ── */}
          {activeSection === "profile" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Perfil Profissional</CardTitle>
                      <CardDescription>Seus dados de identificação</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 max-w-lg">
                  {/* Avatar upload */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xl font-semibold text-primary">
                        {fullName ? fullName[0].toUpperCase() : user?.email?.[0].toUpperCase() ?? "U"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{fullName || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr(a). ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={user?.email ?? ""} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                  </div>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar perfil"}
                  </Button>
                </CardContent>
              </Card>

              {/* Password change card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <KeyRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Alterar Senha</CardTitle>
                      <CardDescription>Defina uma nova senha para sua conta</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPwd ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPwd((v) => !v)}
                      >
                        {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">As senhas não coincidem</p>
                    )}
                  </div>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                  >
                    {savingPassword ? "Salvando..." : "Alterar senha"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── CONFIGURAÇÕES PROFISSIONAIS ── */}
          {activeSection === "professional" && (
            <div className="space-y-6">
              {/* Atendimento */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Atendimento</CardTitle>
                      <CardDescription>Valor e duração padrão de cada sessão</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 max-w-lg">
                    <div className="space-y-2">
                      <Label>Valor padrão por sessão (R$)</Label>
                      <Input
                        type="number" min="0" step="0.01"
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duração da sessão (min)</Label>
                      <Input
                        type="number" min="15" max="180" step="5"
                        value={sessionDuration}
                        onChange={(e) => setSessionDuration(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grade Horária */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Grade Horária</CardTitle>
                      <CardDescription>Expediente e dias de atendimento</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 max-w-lg">
                    <div className="space-y-2">
                      <Label>Início do expediente</Label>
                      <Input
                        type="number" min="0" max="23"
                        value={calendarStart}
                        onChange={(e) => setCalendarStart(e.target.value)}
                        placeholder="7"
                      />
                      <p className="text-xs text-muted-foreground">Hora de início no calendário</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Fim do expediente</Label>
                      <Input
                        type="number" min="0" max="23"
                        value={calendarEnd}
                        onChange={(e) => setCalendarEnd(e.target.value)}
                        placeholder="22"
                      />
                      <p className="text-xs text-muted-foreground">Hora final no calendário</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dias de atendimento</Label>
                    <div className="flex gap-2">
                      {DAY_LABELS.map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleDay(i)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                            workingDays.includes(i)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Período Ocioso */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Período Ocioso</CardTitle>
                      <CardDescription>Almoço ou intervalo sem atendimentos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 max-w-lg">
                    <div className="space-y-2">
                      <Label>Início do intervalo</Label>
                      <Input type="time" value={lunchStart} onChange={(e) => setLunchStart(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim do intervalo</Label>
                      <Input type="time" value={lunchEnd} onChange={(e) => setLunchEnd(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O calendário exibirá este período como indisponível
                  </p>
                </CardContent>
              </Card>

              <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? "Salvando..." : "Salvar configurações profissionais"}
              </Button>
            </div>
          )}

          {/* ── CLÍNICAS ── */}
          {activeSection === "clinics" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Clínicas vinculadas</CardTitle>
                    <CardDescription>Controle o que cada clínica pode acessar na sua conta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {memberships.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Você não está vinculada a nenhuma clínica.
                  </p>
                ) : (
                  memberships.map((m) => {
                    const clinicInfo = (m as typeof m & { clinics?: { name: string; description: string | null } | null }).clinics;
                    return (
                      <div key={m.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              {clinicInfo?.name ?? "Clínica"}
                            </p>
                            {clinicInfo?.description && (
                              <p className="text-xs text-muted-foreground">{clinicInfo.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive text-xs"
                            onClick={() => handleDisconnect(m.id, clinicInfo?.name ?? "clínica")}
                          >
                            Desconectar
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.keys(permLabels) as Array<keyof ClinicPermissions>).map((key) => (
                            <div key={key} className="flex items-center gap-2">
                              <Switch
                                id={`${m.id}-${key}`}
                                checked={!!m.permissions[key]}
                                onCheckedChange={() => handleTogglePermission(m.id, m.permissions, key)}
                              />
                              <Label htmlFor={`${m.id}-${key}`} className="text-xs cursor-pointer">
                                {permLabels[key]}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
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
                      { keys: "Ctrl + K", desc: "Busca global" },
                      { keys: "Alt + D",  desc: "Dashboard"    },
                      { keys: "Alt + N",  desc: "Agenda"       },
                      { keys: "Alt + P",  desc: "Pacientes"    },
                      { keys: "Alt + F",  desc: "Financeiro"   },
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
