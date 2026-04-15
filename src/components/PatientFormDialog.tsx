import {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {type Patient, useCreatePatient, useCreatePatientForPsych, useUpdatePatient} from "@/hooks/usePatients";
import {toast} from "sonner";

export interface AvailablePsych {
  userId: string;
  name: string;
}

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  /** When the admin is editing a patient that belongs to a specific psych */
  targetUserId?: string;
  /**
   * Clinic mode: list of psychologists the admin can create patients for.
   * When provided (and not editing), a required selector is shown.
   */
  availablePsychs?: AvailablePsych[];
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const PHONE_REGEX = /^\(\d{2}\) \d{4,5}-\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  targetUserId,
  availablePsychs,
}: PatientFormDialogProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // For clinic mode: which psychologist this patient belongs to
  const [selectedPsychId, setSelectedPsychId] = useState<string>(() => {
    if (targetUserId) return targetUserId;
    if (availablePsychs?.length === 1) return availablePsychs[0].userId;
    return "";
  });

  const createPatient = useCreatePatient();
  const createPatientForPsych = useCreatePatientForPsych();
  const updatePatient = useUpdatePatient();
  const isEditing = !!patient;
  const isClinicMode = !!availablePsychs || !!targetUserId;

  useEffect(() => {
    if (patient) {
      setFullName(patient.full_name);
      setPhone(patient.phone ? formatPhone(patient.phone) : "");
      setEmail(patient.email ?? "");
      setBirthDate(patient.birth_date ?? "");
      setNotes(patient.notes ?? "");
    } else {
      setFullName("");
      setPhone("");
      setEmail("");
      setBirthDate("");
      setNotes("");
    }
    // Reset psych selection on open
    setSelectedPsychId(
      targetUserId ?? (availablePsychs?.length === 1 ? availablePsychs[0].userId : ""),
    );
    setErrors({});
  }, [patient, open]);  // eslint-disable-line react-hooks/exhaustive-deps

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (phone && !PHONE_REGEX.test(phone)) {
      newErrors.phone = "Formato inválido. Use (XX) XXXXX-XXXX";
    }
    if (email && !EMAIL_REGEX.test(email)) {
      newErrors.email = "Email inválido";
    }
    if (!isEditing && isClinicMode && !selectedPsychId) {
      newErrors.psych = "Selecione a psicóloga";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const rawPhone = phone.replace(/\D/g, "");
    const payload = {
      full_name: fullName,
      phone: rawPhone || null,
      email: email || null,
      birth_date: birthDate || null,
      notes: notes || null,
    };

    try {
      if (isEditing) {
        await updatePatient.mutateAsync({ id: patient.id, ...payload });
        toast.success("Paciente atualizado!");
      } else if (isClinicMode && selectedPsychId) {
        // Create on behalf of the selected psychologist
        await createPatientForPsych.mutateAsync({ ...payload, user_id: selectedPsychId });
        toast.success("Paciente cadastrado!");
      } else {
        await createPatient.mutateAsync(payload);
        toast.success("Paciente cadastrado!");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const loading =
    createPatient.isPending || createPatientForPsych.isPending || updatePatient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar paciente" : "Novo paciente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Clinic mode: select target psychologist when creating */}
          {!isEditing && availablePsychs && availablePsychs.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="psych">Psicóloga *</Label>
              <Select value={selectedPsychId} onValueChange={setSelectedPsychId}>
                <SelectTrigger id="psych">
                  <SelectValue placeholder="Selecione a psicóloga" />
                </SelectTrigger>
                <SelectContent>
                  {availablePsychs.map((p) => (
                    <SelectItem key={p.userId} value={p.userId}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.psych && <p className="text-xs text-destructive">{errors.psych}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo *</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                }}
                placeholder="(11) 99999-9999"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
