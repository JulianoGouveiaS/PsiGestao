import {useNavigate, useParams} from "react-router-dom";
import {usePatient, useUpdatePatient} from "@/hooks/usePatients";
import {useAuth} from "@/contexts/AuthContext";
import {useClinicContext} from "@/contexts/ClinicContext";
import {PatientFormDialog} from "@/components/PatientFormDialog";
import {PatientTimeline} from "@/components/PatientTimeline";
import {AnamnesisForm} from "@/components/AnamnesisForm";
import {PatientPackages} from "@/components/PatientPackages";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {toast} from "sonner";
import {
    ArrowLeft,
    CalendarDays,
    ClipboardList,
    Clock,
    FileText,
    Mail,
    PackageIcon,
    Pencil,
    Phone,
    UserX
} from "lucide-react";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { members } = useClinicContext();
  const { data: patient, isLoading } = usePatient(id);
  const updatePatient = useUpdatePatient();
  const [editOpen, setEditOpen] = useState(false);

  const isClinic = userRole === "clinic_admin";

  // In clinic mode, only show edit/inactivate if admin has manage_patients for this patient's psych
  const canManage = !isClinic || !!members.find(
    (m) => m.psychologist_user_id === patient?.user_id && m.permissions.manage_patients,
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  const handleToggleStatus = async () => {
    const newStatus = patient.status === "active" ? "inactive" : "active";
    try {
      await updatePatient.mutateAsync({ id: patient.id, status: newStatus });
      toast.success(newStatus === "inactive" ? "Paciente inativado" : "Paciente reativado");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const infoItems = [
    { icon: Phone, label: "Telefone", value: patient.phone },
    { icon: Mail, label: "Email", value: patient.email },
    {
      icon: CalendarDays,
      label: "Data de nascimento",
      value: patient.birth_date
        ? format(new Date(patient.birth_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        : null,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Perfil do Paciente</h1>
      </div>

      {/* Patient info card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {patient.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-xl">{patient.full_name}</CardTitle>
              <Badge variant={patient.status === "active" ? "default" : "secondary"} className="mt-1">
                {patient.status === "active" ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                  <UserX className="mr-1 h-3 w-3" />
                  {patient.status === "active" ? "Inativar" : "Reativar"}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-4">
          {infoItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm text-foreground">{value || "—"}</p>
              </div>
            </div>
          ))}
          {patient.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{patient.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Timeline + Anamnesis */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">
            <Clock className="h-3 w-3 mr-1" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="anamnesis">
            <ClipboardList className="h-3 w-3 mr-1" /> Anamnese
          </TabsTrigger>
          <TabsTrigger value="packages">
            <PackageIcon className="h-3 w-3 mr-1" /> Pacotes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linha do tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <PatientTimeline patientId={patient.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anamnesis">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ficha de Anamnese</CardTitle>
            </CardHeader>
            <CardContent>
              <AnamnesisForm patientId={patient.id} patientName={patient.full_name} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pacotes de Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              <PatientPackages patientId={patient.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} patient={patient} />
    </div>
  );
}
