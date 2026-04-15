import {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {type Package, useCreatePackage, useUpdatePackage} from "@/hooks/usePackages";
import {usePackageTemplates} from "@/hooks/usePackageTemplates";
import {useAllPatients} from "@/hooks/usePatients";
import {toast} from "sonner";

interface PackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  editPackage?: Package | null;
}

export function PackageFormDialog({ open, onOpenChange, patientId, editPackage }: PackageFormDialogProps) {
  const [selectedPatientId, setSelectedPatientId] = useState(patientId ?? "");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [name, setName] = useState("Pacote Mensal");
  const [totalSessions, setTotalSessions] = useState("4");
  const [sessionPrice, setSessionPrice] = useState("");
  const [totalPriceInput, setTotalPriceInput] = useState("");
  const [lastEdited, setLastEdited] = useState<"session" | "total">("session");

  const { data: patients } = useAllPatients();
  const { data: templates } = usePackageTemplates();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();

  const isEditing = !!editPackage;

  useEffect(() => {
    if (!open) return;
    if (editPackage) {
      setSelectedPatientId(editPackage.patient_id);
      setSelectedTemplateId("");
      setName(editPackage.name);
      setTotalSessions(String(editPackage.total_sessions));
      setSessionPrice(String(editPackage.session_price));
      setTotalPriceInput(String(editPackage.total_price));
      setLastEdited("session");
    } else {
      setSelectedPatientId(patientId ?? "");
      setSelectedTemplateId("");
      setName("Pacote Mensal");
      setTotalSessions("4");
      setSessionPrice("");
      setTotalPriceInput("");
      setLastEdited("session");
    }
  }, [open, editPackage, patientId]);

  // When a template is selected, fill form fields
  useEffect(() => {
    if (!selectedTemplateId || !templates) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      setName(tpl.name);
      setTotalSessions(String(tpl.total_sessions));
      setSessionPrice(String(tpl.session_price));
      setTotalPriceInput(String(tpl.total_sessions * Number(tpl.session_price)));
      setLastEdited("session");
    }
  }, [selectedTemplateId, templates]);

  const totalPrice = parseFloat(totalPriceInput) || 0;

  const handleSessionsChange = (val: string) => {
    setTotalSessions(val);
    const sessions = parseInt(val) || 0;
    if (lastEdited === "total" && sessions > 0) {
      setSessionPrice((totalPrice / sessions).toFixed(2));
    } else {
      const price = parseFloat(sessionPrice) || 0;
      setTotalPriceInput((sessions * price).toFixed(2));
    }
  };

  const handleSessionPriceChange = (val: string) => {
    setSessionPrice(val);
    setLastEdited("session");
    const sessions = parseInt(totalSessions) || 0;
    setTotalPriceInput((sessions * (parseFloat(val) || 0)).toFixed(2));
  };

  const handleTotalPriceChange = (val: string) => {
    setTotalPriceInput(val);
    setLastEdited("total");
    const sessions = parseInt(totalSessions) || 0;
    if (sessions > 0) setSessionPrice(((parseFloat(val) || 0) / sessions).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        patient_id: selectedPatientId,
        name,
        total_sessions: parseInt(totalSessions),
        session_price: parseFloat(sessionPrice),
        total_price: totalPrice,
      };

      if (isEditing) {
        await updatePackage.mutateAsync({ id: editPackage.id, ...payload });
        toast.success("Pacote atualizado!");
      } else {
        await createPackage.mutateAsync(payload);
        toast.success("Pacote vinculado ao paciente!");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const activePatients = patients?.filter((p) => p.status === "active") ?? [];
  const isPending = createPackage.isPending || updatePackage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Pacote" : "Vincular Pacote"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente *</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId} required disabled={!!patientId}>
              <SelectTrigger>
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
          </div>

          {!isEditing && templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Modelo de pacote</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo ou preencha manualmente" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.total_sessions} sessões × R$ {Number(t.session_price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome do pacote</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pacote Mensal" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº de sessões *</Label>
              <Input
                type="number"
                min="1"
                value={totalSessions}
                onChange={(e) => handleSessionsChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor por sessão (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="150.00"
                value={sessionPrice}
                onChange={(e) => handleSessionPriceChange(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor total (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="600.00"
              value={totalPriceInput}
              onChange={(e) => handleTotalPriceChange(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !selectedPatientId}>
              {isPending ? "Salvando..." : isEditing ? "Salvar" : "Vincular pacote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
