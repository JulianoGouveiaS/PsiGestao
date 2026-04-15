import {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";
import {
    CalendarDays,
    Clock,
    DollarSign,
    Download,
    ExternalLink,
    FileText,
    MapPin,
    Paperclip,
    Video,
} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useSessionNotes} from "@/hooks/useSessionNotes";
import {getAttachmentSignedUrl, useSessionAttachments} from "@/hooks/useSessionAttachments";

interface SessionViewData {
  id: string;
  scheduled_at: string;
  status: string;
  price: number;
  modality?: string;
  patient_id?: string;
}

interface SessionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionViewData | null;
  patientName?: string;
}

const statusLabels: Record<string, string> = {
  scheduled:   "Agendada",
  completed:   "Realizada",
  missed:      "Falta",
  cancelled:   "Cancelada",
  rescheduled: "Remarcada",
};

const statusColors: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-800",
  completed:   "bg-green-100 text-green-800",
  missed:      "bg-red-100 text-red-800",
  cancelled:   "bg-muted text-muted-foreground",
  rescheduled: "bg-purple-100 text-purple-800",
};

// ── Inner component keeps all hooks unconditional ────────────────────────────
function SessionViewContent({
  session,
  onOpenChange,
}: {
  session: SessionViewData;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  const { data: notes } = useSessionNotes(session.id);
  const existingNote = notes?.[0];
  const { data: attachments } = useSessionAttachments(existingNote?.id);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs whenever the attachment list changes
  useEffect(() => {
    if (!attachments || attachments.length === 0) {
      setAttachmentUrls({});
      return;
    }
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const att of attachments) {
        try {
          urls[att.id] = await getAttachmentSignedUrl(att.file_path);
        } catch { /* skip individual failures */ }
      }
      if (!cancelled) setAttachmentUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [attachments]);

  const date = new Date(session.scheduled_at);
  const hasNote = !!existingNote?.content?.trim();
  const hasAttachments = (attachments?.length ?? 0) > 0;
  const showNotesTab = hasNote || hasAttachments;

  // ── Reusable detail block ──────────────────────────────────────────────────
  const detailsBlock = (
    <div className="space-y-3">
      <div className="space-y-3 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{format(date, "HH:mm")}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">R$ {Number(session.price).toFixed(2)}</span>
        </div>
      </div>

      <Separator />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => { onOpenChange(false); navigate("/agenda"); }}
      >
        <ExternalLink className="mr-2 h-3.5 w-3.5" />
        Mostrar no calendário
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Status + modality header */}
      <div className="flex items-center justify-between">
        <Badge className={statusColors[session.status] ?? statusColors.scheduled}>
          {statusLabels[session.status] ?? session.status}
        </Badge>
        {session.modality && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {session.modality === "online"
              ? <Video className="h-3.5 w-3.5" />
              : <MapPin className="h-3.5 w-3.5" />}
            {session.modality === "online" ? "Online" : "Presencial"}
          </div>
        )}
      </div>

      {showNotesTab ? (
        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              <FileText className="h-3 w-3 mr-1" />
              Notas
              {hasAttachments && (
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {attachments!.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-3">
            {detailsBlock}
          </TabsContent>

          <TabsContent value="notes" className="mt-3 space-y-4">
            {/* Note content */}
            {hasNote && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Anotações da sessão</p>
                <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {existingNote!.content}
                </div>
              </div>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  Anexos ({attachments!.length})
                </p>
                <div className="space-y-1.5">
                  {attachments!.map((att) => {
                    const isImage = att.content_type.startsWith("image/");
                    const url = attachmentUrls[att.id];
                    const sizeKB = (att.file_size / 1024).toFixed(0);
                    return (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 rounded-md border border-border p-2"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm text-foreground">{att.file_name}</p>
                          <p className="text-xs text-muted-foreground">{sizeKB} KB</p>
                        </div>
                        {isImage && url && (
                          <img
                            src={url}
                            alt={att.file_name}
                            className="h-8 w-8 rounded object-cover shrink-0"
                          />
                        )}
                        <a
                          href={url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-disabled={!url}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={!url}
                            title="Baixar"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasNote && !hasAttachments && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma anotação ou anexo nesta sessão.
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        detailsBlock
      )}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function SessionViewDialog({
  open,
  onOpenChange,
  session,
}: SessionViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Detalhes da Sessão</DialogTitle>
        </DialogHeader>
        {session && (
          <SessionViewContent session={session} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}
