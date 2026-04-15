import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Button} from "@/components/ui/button";
import {usePatient} from "@/hooks/usePatients";
import {CalendarDays, ExternalLink, FileText, Mail, Phone} from "lucide-react";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";
import {useNavigate} from "react-router-dom";

interface PatientProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string | null;
}

export function PatientProfileDialog({ open, onOpenChange, patientId }: PatientProfileDialogProps) {
  const { data: patient, isLoading } = usePatient(patientId ?? undefined);
  const navigate = useNavigate();

  if (!patientId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil do Paciente</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !patient ? (
          <p className="text-sm text-muted-foreground text-center py-4">Paciente não encontrado.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {patient.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{patient.full_name}</p>
                <Badge variant={patient.status === "active" ? "default" : "secondary"} className="mt-0.5">
                  {patient.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              {patient.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{patient.email}</span>
                </div>
              )}
              {patient.birth_date && (
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(patient.birth_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              {patient.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm whitespace-pre-wrap">{patient.notes}</span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                navigate(`/patients/${patient.id}`);
              }}
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Abrir perfil completo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
