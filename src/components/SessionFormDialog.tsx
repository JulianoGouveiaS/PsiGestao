import {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {useCreateSession} from "@/hooks/useSessions";
import {useAllPatients} from "@/hooks/usePatients";
import {useActivePackage} from "@/hooks/usePackages";
import {useProfessionalSettings} from "@/hooks/useProfessionalSettings";
import {toast} from "sonner";
import {addWeeks, format} from "date-fns";
import {ptBR} from "date-fns/locale";
import {CalendarPlus, MapPin, Repeat, Video} from "lucide-react";
import type {Database} from "@/integrations/supabase/types";

type SessionModality = Database["public"]["Enums"]["session_modality"];

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
}

type FormErrors = {
  patientId?: string;
  scheduledAt?: string;
  price?: string;
};

export function SessionFormDialog({ open, onOpenChange, defaultDate }: SessionFormDialogProps) {
  const [patientId, setPatientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [price, setPrice] = useState("");
  const [modality, setModality] = useState<SessionModality>("presencial");
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState("4");
  const [errors, setErrors] = useState<FormErrors>({});

  const createSession = useCreateSession();
  const { data: patients } = useAllPatients();
  const { data: professionalSettings } = useProfessionalSettings();
  const { data: activePackage } = useActivePackage(patientId || undefined);

  useEffect(() => {
    if (activePackage && patientId) {
      setPrice(String(activePackage.session_price));
      if (recurring) {
        const remaining = activePackage.total_sessions - activePackage.sessions_used;
        if (remaining > 0) setWeeks(String(remaining));
      }
    } else if (professionalSettings && !activePackage && patientId) {
      setPrice(String(professionalSettings.default_session_price));
    }
  }, [activePackage, patientId, recurring, professionalSettings]);

  useEffect(() => {
    if (defaultDate && open) {
      setScheduledAt(format(defaultDate, "yyyy-MM-dd'T'HH:mm"));
    }
    if (!open) {
      setPatientId("");
      setScheduledAt("");
      setPrice("");
      setModality("presencial");
      setRecurring(false);
      setWeeks("4");
      setErrors({});
    }
  }, [defaultDate, open]);

  const weeksNum = Math.max(1, Math.min(52, parseInt(weeks) || 1));

  const previewDates = scheduledAt
    ? Array.from({ length: recurring ? weeksNum : 1 }, (_, i) =>
        addWeeks(new Date(scheduledAt), i)
      )
    : [];

  const remainingSessions = activePackage
    ? activePackage.total_sessions - activePackage.sessions_used
    : null;

  const willExceedPackage = remainingSessions !== null && previewDates.length > remainingSessions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields inline
    const newErrors: FormErrors = {};
    if (!patientId)                         newErrors.patientId   = "Selecione um paciente para continuar.";
    if (!scheduledAt)                       newErrors.scheduledAt = "Informe a data e o horário da sessão.";
    if (!price || parseFloat(price) <= 0)   newErrors.price       = "Informe um valor válido para a sessão.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (willExceedPackage) {
      toast.error("Pacote insuficiente", {
        description: `O pacote tem apenas ${remainingSessions} sessão(ões) restante(s), mas você está tentando agendar ${previewDates.length}.`,
      });
      return;
    }

    try {
      // Generate one series_id for all sessions when creating a recurring series
      const seriesId = recurring && previewDates.length > 1
        ? crypto.randomUUID()
        : undefined;

      for (const date of previewDates) {
        await createSession.mutateAsync({
          patient_id: patientId,
          scheduled_at: date.toISOString(),
          price: parseFloat(price),
          modality,
          meeting_url: null,
          ...(seriesId ? { series_id: seriesId } as any : {}),
        });
      }
      toast.success(
        previewDates.length > 1
          ? `${previewDates.length} sessões agendadas!`
          : "Sessão agendada!"
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error("Erro", { description: (err as Error).message });
    }
  };

  const activePatients = patients?.filter((p) => p.status === "active") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Sessão</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente *</Label>
            <Select
              value={patientId}
              onValueChange={(v) => { setPatientId(v); setErrors((p) => ({ ...p, patientId: undefined })); }}
            >
              <SelectTrigger className={errors.patientId ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione um paciente" />
              </SelectTrigger>
              <SelectContent>
                {activePatients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.patientId && (
              <p className="text-xs text-destructive">{errors.patientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Modalidade *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={modality === "presencial" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setModality("presencial")}
              >
                <MapPin className="mr-1 h-3.5 w-3.5" />
                Presencial
              </Button>
              <Button
                type="button"
                variant={modality === "online" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setModality("online")}
              >
                <Video className="mr-1 h-3.5 w-3.5" />
                Online
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data e hora *</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => { setScheduledAt(e.target.value); setErrors((p) => ({ ...p, scheduledAt: undefined })); }}
              className={errors.scheduledAt ? "border-destructive" : ""}
            />
            {errors.scheduledAt && (
              <p className="text-xs text-destructive">{errors.scheduledAt}</p>
            )}
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Sessão recorrente</p>
                <p className="text-xs text-muted-foreground">Repetir semanalmente</p>
              </div>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          {recurring && (
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div className="space-y-2">
                <Label>Repetir por quantas semanas?</Label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                />
              </div>

              {scheduledAt && previewDates.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {previewDates.length} sessão(ões) serão criadas:
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {previewDates.map((d, i) => (
                      <p key={i} className="text-xs text-foreground flex items-center gap-1">
                        <CalendarPlus className="h-3 w-3 text-primary" />
                        {format(d, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {willExceedPackage && (
                <p className="text-xs text-destructive font-medium">
                  ⚠️ O pacote possui apenas {remainingSessions} sessão(ões) restante(s).
                  Reduza para {remainingSessions} semanas ou ajuste o pacote.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            {activePackage && (
              <p className="text-xs text-muted-foreground">
                Pacote ativo: {activePackage.name} — {activePackage.sessions_used}/{activePackage.total_sessions} sessões usadas
              </p>
            )}
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={professionalSettings ? String(professionalSettings.default_session_price) : "150.00"}
              value={price}
              onChange={(e) => { setPrice(e.target.value); setErrors((p) => ({ ...p, price: undefined })); }}
              className={errors.price ? "border-destructive" : ""}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createSession.isPending}
            >
              {createSession.isPending
                ? "Salvando..."
                : recurring
                ? `Agendar ${previewDates.length} sessões`
                : "Agendar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
