import {useState} from "react";
import {
    getDayName,
    useCreateWaitlistEntry,
    useDeleteWaitlistEntry,
    useUpdateWaitlistEntry,
    useWaitlist,
    type WaitlistEntry
} from "@/hooks/useWaitlist";
import {useAllPatients} from "@/hooks/usePatients";
import {PageTransition} from "@/components/PageTransition";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {EmptyState} from "@/components/EmptyState";
import {SkeletonList} from "@/components/SkeletonList";
import {toast} from "sonner";
import {CheckCircle, ClipboardList, Clock, MoreVertical, Pencil, Plus, Trash2, XCircle} from "lucide-react";

const DAYS = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

type WaitlistFormState = {
  patientId: string;
  preferredDay: string;
  preferredTime: string;
  notes: string;
};

const emptyForm: WaitlistFormState = { patientId: "", preferredDay: "", preferredTime: "", notes: "" };

export default function Waitlist() {
  const { data: entries, isLoading } = useWaitlist();
  const { data: patients = [] } = useAllPatients();
  const createEntry = useCreateWaitlistEntry();
  const updateEntry = useUpdateWaitlistEntry();
  const deleteEntry = useDeleteWaitlistEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [form, setForm] = useState<WaitlistFormState>(emptyForm);

  const activePatients = patients?.filter((p) => p.status === "active") || [];
  const waitingEntries = entries?.filter((e) => e.status === "waiting") || [];
  const resolvedEntries = entries?.filter((e) => e.status !== "waiting") || [];

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => {
    setEditingEntry(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entry: WaitlistEntry) => {
    setEditingEntry(entry);
    setForm({
      patientId: entry.patient_id,
      preferredDay: String(entry.preferred_day),
      preferredTime: entry.preferred_time?.slice(0, 5) ?? "",
      notes: entry.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.preferredDay) return;
    try {
      if (editingEntry) {
        await updateEntry.mutateAsync({
          id: editingEntry.id,
          preferred_day: parseInt(form.preferredDay),
          preferred_time: form.preferredTime || null,
          notes: form.notes || null,
        });
        toast.success("Entrada atualizada");
      } else {
        await createEntry.mutateAsync({
          patient_id: form.patientId,
          preferred_day: parseInt(form.preferredDay),
          preferred_time: form.preferredTime || null,
          notes: form.notes || null,
        });
        toast.success("Paciente adicionado à lista de espera");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleMarkScheduled = async (id: string) => {
    try {
      await updateEntry.mutateAsync({ id, status: "scheduled" });
      toast.success("Marcado como agendado");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await updateEntry.mutateAsync({ id, status: "cancelled" });
      toast.success("Removido da lista de espera");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast.success("Entrada removida");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">Aguardando</Badge>;
      case "scheduled":
        return <Badge variant="default" className="bg-green-600">Agendado</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return null;
    }
  };

  const isSaving = createEntry.isPending || updateEntry.isPending;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lista de Espera</h1>
            <p className="text-sm text-muted-foreground">
              Pacientes aguardando abertura de horário
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar à lista
          </Button>
        </div>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : !entries?.length ? (
          <EmptyState
            icon={ClipboardList}
            title="Lista de espera vazia"
            description="Adicione pacientes que precisam de um horário específico mas que ainda não está disponível."
            actionLabel="Adicionar paciente"
            onAction={openCreate}
          />
        ) : (
          <div className="space-y-6">
            {waitingEntries.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Aguardando ({waitingEntries.length})</h2>
                <div className="grid gap-3">
                  {waitingEntries.map((entry) => (
                    <Card key={entry.id} className="transition-colors hover:bg-muted/30">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {entry.patients?.full_name || "Paciente"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getDayName(entry.preferred_day)}
                              {entry.preferred_time && ` às ${entry.preferred_time.slice(0, 5)}`}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(entry.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMarkScheduled(entry.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Marcar como agendado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(entry.id)}>
                                <XCircle className="mr-2 h-4 w-4" /> Cancelar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(entry.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {resolvedEntries.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-muted-foreground">Resolvidos ({resolvedEntries.length})</h2>
                <div className="grid gap-3">
                  {resolvedEntries.map((entry) => (
                    <Card key={entry.id} className="opacity-60">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {entry.patients?.full_name || "Paciente"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getDayName(entry.preferred_day)}
                              {entry.preferred_time && ` às ${entry.preferred_time.slice(0, 5)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(entry.status)}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Editar entrada na lista" : "Adicionar à Lista de Espera"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select
                  value={form.patientId}
                  onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}
                  disabled={!!editingEntry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dia desejado</Label>
                <Select value={form.preferredDay} onValueChange={(v) => setForm((f) => ({ ...f, preferredDay: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário preferido (opcional)</Label>
                <Input
                  type="time"
                  value={form.preferredTime}
                  onChange={(e) => setForm((f) => ({ ...f, preferredTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Ex: Prefere após às 18h"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.patientId || !form.preferredDay || isSaving}
              >
                {isSaving ? "Salvando..." : editingEntry ? "Salvar alterações" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
