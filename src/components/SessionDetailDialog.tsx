import {useCallback, useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Separator} from "@/components/ui/separator";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {PatientProfileDialog} from "@/components/PatientProfileDialog";
import {type Session, useRescheduleSession, useUpdateSession, useUpdateSessionSeries} from "@/hooks/useSessions";
import {useUpdatePayment} from "@/hooks/usePayments";
import {useSessionNotes, useUpsertSessionNote} from "@/hooks/useSessionNotes";
import {useGenerateMeetLink} from "@/hooks/useMeetLink";
import {toast} from "sonner";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";
import {
    CalendarDays,
    Check,
    Clock,
    DollarSign,
    Download,
    ExternalLink,
    FileText,
    Layers,
    MapPin,
    Paperclip,
    Pencil,
    RefreshCw,
    Trash2,
    Upload,
    User,
    Video,
    X
} from "lucide-react";
import {
    getAttachmentSignedUrl,
    useDeleteAttachment,
    useSessionAttachments,
    useUploadAttachment
} from "@/hooks/useSessionAttachments";
import type {Database} from "@/integrations/supabase/types";

type SessionStatus = Database["public"]["Enums"]["session_status"];

interface SessionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  canManageSessions?: boolean;
}

const statusLabels: Record<SessionStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  missed: "Falta",
  cancelled: "Cancelada",
  rescheduled: "Remarcada",
};

const statusColors: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
  rescheduled: "bg-purple-100 text-purple-800",
};

export function SessionDetailDialog({ open, onOpenChange, session, canManageSessions = true }: SessionDetailDialogProps) {
  const updateSession = useUpdateSession();
  const rescheduleSession = useRescheduleSession();
  const updateSessionSeries = useUpdateSessionSeries();
  const updatePayment = useUpdatePayment();
  const generateMeetLink = useGenerateMeetLink();

  const [noteContent, setNoteContent] = useState("");
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [patientProfileOpen, setPatientProfileOpen] = useState(false);

  // Reschedule modal state (separate modal on top)
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");

  // Inline edit state
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editModality, setEditModality] = useState<"presencial" | "online">("presencial");
  const [confirmSeriesEdit, setConfirmSeriesEdit] = useState(false);
  const [pendingSeriesUpdates, setPendingSeriesUpdates] = useState<{ price?: number; modality?: string } | null>(null);

  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  const { data: notes } = useSessionNotes(session?.id);
  const existingNote = notes?.[0];
  const upsertNote = useUpsertSessionNote();
  const { data: attachments } = useSessionAttachments(existingNote?.id);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  useEffect(() => {
    if (existingNote) setNoteContent(existingNote.content);
    else setNoteContent("");
    setSaved(false);
  }, [existingNote, session?.id]);

  useEffect(() => {
    setRescheduleOpen(false);
    setRescheduleDate("");
    setEditMode(false);
  }, [session?.id, open]);

  useEffect(() => {
    if (session) {
      setEditDate(format(new Date(session.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
      setEditPrice(String(session.price));
      setEditModality((session as any).modality === "online" ? "online" : "presencial");
    }
  }, [session?.id]);

  useEffect(() => {
    if (!attachments || attachments.length === 0) { setAttachmentUrls({}); return; }
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const att of attachments) {
        try { urls[att.id] = await getAttachmentSignedUrl(att.file_path); } catch {}
      }
      if (!cancelled) setAttachmentUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [attachments]);

  const saveNote = useCallback(async (content: string) => {
    if (!session) return;
    if (!content.trim() && !existingNote) return;
    try {
      await upsertNote.mutateAsync({ sessionId: session.id, content: content.trim(), noteId: existingNote?.id });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  }, [session, existingNote, upsertNote]);

  const handleNoteChange = (value: string) => {
    setNoteContent(value);
    setSaved(false);
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setAutoSaveTimer(setTimeout(() => saveNote(value), 1500));
  };

  if (!session) return null;

  const date = new Date(session.scheduled_at);
  const isCompleted = session.status === "completed";
  const isCancelled = session.status === "cancelled";
  const isRescheduled = session.status === "rescheduled";
  const meetDisabled = isCompleted || isCancelled || isRescheduled;
  const isOnline = (session as any).modality === "online";
  const existingMeetUrl: string | undefined = (session as any).meeting_url;

  const handleSaveEdit = async (applyToSeries = false) => {
    if (!session) return;
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) { toast.error("Informe um valor válido"); return; }
    try {
      await updateSession.mutateAsync({
        id: session.id,
        scheduled_at: new Date(editDate).toISOString(),
        price: newPrice,
        modality: editModality as any,
      });
      const payment = session.payments?.[0];
      if (payment && newPrice !== Number(session.price)) {
        await updatePayment.mutateAsync({ id: payment.id, amount_paid: Number(payment.amount_paid), total_amount: newPrice });
      }
      const seriesId = (session as any).series_id;
      if (applyToSeries && seriesId) {
        await updateSessionSeries.mutateAsync({ seriesId, updates: { price: newPrice, modality: editModality } });
        toast.success("Sessão e série atualizadas!");
      } else {
        toast.success("Sessão atualizada!");
      }
      setEditMode(false);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleEditSaveClick = () => {
    const seriesId = (session as any)?.series_id;
    const priceChanged = parseFloat(editPrice) !== Number(session?.price);
    const modalityChanged = editModality !== ((session as any)?.modality ?? "presencial");
    if (seriesId && (priceChanged || modalityChanged)) {
      setPendingSeriesUpdates({ price: parseFloat(editPrice), modality: editModality });
      setConfirmSeriesEdit(true);
    } else {
      handleSaveEdit(false);
    }
  };

  const handleStatusChange = async (status: SessionStatus) => {
    if (status === "cancelled") { setConfirmCancel(true); return; }
    try {
      await updateSession.mutateAsync({ id: session.id, status });
      toast.success(`Status alterado para "${statusLabels[status]}"`);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleConfirmCancel = async () => {
    try {
      await updateSession.mutateAsync({ id: session.id, status: "cancelled" as SessionStatus });
      // Cancellation originated by the professional → auto-mark payment as paid
      // so the session does not appear as debt in the Payments screen.
      const payment = session.payments?.[0];
      if (payment) {
        await updatePayment.mutateAsync({
          id: payment.id,
          amount_paid: Number(payment.total_amount),
          total_amount: Number(payment.total_amount),
        });
      }
      toast.success("Sessão cancelada — pagamento marcado como quitado.");
      setConfirmCancel(false);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleMeetClick = async () => {
    if (existingMeetUrl) { window.open(existingMeetUrl, "_blank"); return; }
    try {
      const result = await generateMeetLink.mutateAsync({
        sessionId: session.id,
        scheduledAt: session.scheduled_at,
        patientName: session.patients?.full_name ?? "Paciente",
      });
      window.open(result.meetLink, "_blank");
    } catch (err: any) {
      toast.warning("Link personalizado indisponível — abrindo sala genérica.", { description: err.message });
      window.open("https://meet.google.com/new", "_blank");
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Sessão
            {canManageSessions && (
              <button
                onClick={() => setEditMode((v) => !v)}
                className={`rounded p-1 transition-colors ${editMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                title="Editar sessão"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Patient — clickable to open profile */}
          <button
            className="flex items-center gap-3 w-full text-left rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors group"
            onClick={() => setPatientProfileOpen(true)}
            title="Ver perfil do paciente"
          >
            <User className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Paciente</p>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {session.patients?.full_name ?? "—"}
              </p>
            </div>
          </button>

          {/* Edit form */}
          {editMode && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary">Editar sessão</p>
              <div className="space-y-2">
                <Label className="text-xs">Data e hora</Label>
                <Input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Modalidade</Label>
                  <div className="flex gap-1">
                    {(["presencial", "online"] as const).map((mod) => (
                      <button key={mod} type="button" onClick={() => setEditModality(mod)}
                        className={`flex-1 flex items-center justify-center gap-1 rounded border py-1.5 text-xs transition-colors ${
                          editModality === mod ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
                        }`}>
                        {mod === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {mod === "online" ? "Online" : "Presencial"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7 flex-1" onClick={handleEditSaveClick} disabled={updateSession.isPending}>
                  <Check className="h-3 w-3 mr-1" /> {updateSession.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditMode(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Date / time / modality / price */}
          {!editMode && (
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 px-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{format(date, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{format(date, "HH:mm")}</span>
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? <Video className="h-4 w-4 text-muted-foreground" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm text-foreground">{isOnline ? "Online" : "Presencial"}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {Number(session.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          )}

          {/* Meet button */}
          {isOnline && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <Video className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm flex-1">{existingMeetUrl ? "Sala criada" : "Sessão online"}</span>
              <Button variant="default" size="sm"
                disabled={meetDisabled || (!canManageSessions && !existingMeetUrl) || generateMeetLink.isPending}
                onClick={handleMeetClick}>
                {generateMeetLink.isPending ? "Gerando..." : existingMeetUrl
                  ? <><ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir Meet</>
                  : <><Video className="mr-1 h-3.5 w-3.5" /> Criar Meet</>}
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              <FileText className="h-3 w-3 mr-1" /> Notas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {!canManageSessions && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                Somente visualização — você não tem permissão para editar sessões desta psicóloga.
              </p>
            )}

            {/* Status */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Status da sessão</p>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[session.status]}>{statusLabels[session.status]}</Badge>
                <Select value={session.status} onValueChange={(v) => handleStatusChange(v as SessionStatus)} disabled={!canManageSessions}>
                  <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="completed">Realizada</SelectItem>
                    <SelectItem value="missed">Falta</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reschedule */}
            {canManageSessions && !isRescheduled && !isCancelled && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setRescheduleDate(""); setRescheduleOpen(true); }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Remarcar sessão
              </Button>
            )}

            {session.rescheduled_from && (
              <p className="text-xs text-muted-foreground italic">
                ↳ Esta sessão foi remarcada a partir de outra sessão.
              </p>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Notas da sessão</Label>
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="h-3 w-3" /> Salvo
                    </span>
                  )}
                  {upsertNote.isPending && <span className="text-xs text-muted-foreground">Salvando...</span>}
                </div>
                <Textarea
                  placeholder={canManageSessions ? "Escreva suas anotações sobre a sessão aqui. O salvamento é automático..." : "Sem notas registradas."}
                  value={noteContent}
                  onChange={canManageSessions ? (e) => handleNoteChange(e.target.value) : undefined}
                  readOnly={!canManageSessions}
                  rows={8}
                  className="resize-none"
                />
                {canManageSessions && (
                  <p className="text-xs text-muted-foreground">As notas são salvas automaticamente após parar de digitar.</p>
                )}
              </div>

              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> Anexos
                  </Label>
                  {canManageSessions && existingNote && (
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" multiple
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || !existingNote) return;
                          for (const file of Array.from(files)) {
                            try {
                              await uploadAttachment.mutateAsync({ noteId: existingNote.id, file });
                              toast.success(`"${file.name}" anexado!`);
                            } catch (err: any) {
                              toast.error("Erro ao anexar", { description: err.message });
                            }
                          }
                          e.target.value = "";
                        }}
                      />
                      <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Upload className="h-3 w-3" /> Adicionar arquivo
                      </span>
                    </label>
                  )}
                </div>

                {!existingNote && (
                  <p className="text-xs text-muted-foreground italic">Escreva uma nota primeiro para poder adicionar anexos.</p>
                )}
                {uploadAttachment.isPending && <p className="text-xs text-muted-foreground">Enviando...</p>}

                {attachments && attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map((att) => {
                      const isImage = att.content_type.startsWith("image/");
                      const url = attachmentUrls[att.id];
                      const sizeKB = (att.file_size / 1024).toFixed(0);
                      return (
                        <div key={att.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-foreground">{att.file_name}</p>
                            <p className="text-xs text-muted-foreground">{sizeKB} KB</p>
                          </div>
                          {isImage && url && <img src={url} alt={att.file_name} className="h-8 w-8 rounded object-cover" />}
                          <a href={url ?? "#"} target="_blank" rel="noopener noreferrer" title="Baixar" aria-disabled={!url}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!url}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          {canManageSessions && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={async () => {
                                try {
                                  await deleteAttachment.mutateAsync({ id: att.id, filePath: att.file_path, noteId: att.session_note_id });
                                  toast.success("Anexo removido");
                                } catch (err: any) {
                                  toast.error("Erro", { description: err.message });
                                }
                              }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Reschedule modal — rendered on top with its own backdrop */}
    <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> Remarcar sessão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A sessão atual será marcada como <strong>Remarcada</strong> e uma nova será criada.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Nova data e hora</Label>
            <Input type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setRescheduleOpen(false)}>Cancelar</Button>
          <Button className="flex-1"
            disabled={!rescheduleDate || rescheduleSession.isPending}
            onClick={async () => {
              try {
                await rescheduleSession.mutateAsync({
                  originalSessionId: session.id,
                  newScheduledAt: new Date(rescheduleDate).toISOString(),
                });
                toast.success("Sessão remarcada!");
                setRescheduleOpen(false);
                onOpenChange(false);
              } catch (err: any) {
                toast.error("Erro", { description: err.message });
              }
            }}>
            {rescheduleSession.isPending ? "Remarcando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <PatientProfileDialog open={patientProfileOpen} onOpenChange={setPatientProfileOpen} patientId={session.patient_id} />

    <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar sessão?</AlertDialogTitle>
          <AlertDialogDescription>
            A sessão será marcada como <strong>Cancelada</strong> e o pagamento será automaticamente
            marcado como <strong>quitado</strong>, pois o cancelamento foi originado pelo profissional.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCancel}>Confirmar cancelamento</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={confirmSeriesEdit} onOpenChange={setConfirmSeriesEdit}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Sessão em série
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta sessão faz parte de uma série recorrente. Deseja aplicar as alterações de
            <strong> valor e modalidade</strong> a todas as sessões agendadas da série?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => { setConfirmSeriesEdit(false); handleSaveEdit(false); }}>
            Só esta sessão
          </AlertDialogCancel>
          <AlertDialogAction onClick={async () => { setConfirmSeriesEdit(false); await handleSaveEdit(true); }}>
            <Layers className="h-3.5 w-3.5 mr-1" /> Todas da série
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
