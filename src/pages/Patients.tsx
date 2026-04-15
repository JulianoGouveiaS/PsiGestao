import {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {type Patient, usePatients, useUpdatePatient} from "@/hooks/usePatients";
import {useAuth} from "@/contexts/AuthContext";
import {useClinicContext} from "@/contexts/ClinicContext";
import {PatientFormDialog} from "@/components/PatientFormDialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent} from "@/components/ui/card";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {toast} from "sonner";
import {ChevronDown, Eye, MoreVertical, Pencil, Plus, Search, Users, UserX} from "lucide-react";
import {EmptyState} from "@/components/EmptyState";
import {SkeletonList} from "@/components/SkeletonList";
import type {ClinicMember} from "@/hooks/useClinicMembers";

export default function Patients() {
  const { userRole } = useAuth();
  const { members, selectedMember } = useClinicContext();
  const isClinic = userRole === "clinic_admin";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [newPatientPsychId, setNewPatientPsychId] = useState<string | undefined>();

  const { data: result, isLoading } = usePatients(search, page);
  const allPatients = result?.patients ?? [];
  const hasMore = result?.hasMore ?? false;
  const total = result?.total ?? 0;

  const updatePatient = useUpdatePatient();
  const navigate = useNavigate();

  // In clinic mode, respect the psychologist filter from the sidebar
  const patients = useMemo(() => {
    if (!isClinic || !selectedMember) return allPatients;
    return allPatients.filter((p) => p.user_id === selectedMember.psychologist_user_id);
  }, [allPatients, isClinic, selectedMember]);

  // Map psychologist user_id → member (for permissions and display)
  const memberByUserId = useMemo(() => {
    const map = new Map<string, ClinicMember>();
    for (const m of members) map.set(m.psychologist_user_id, m);
    return map;
  }, [members]);

  const canManagePatient = (patient: Patient) => {
    if (!isClinic) return true;
    return !!memberByUserId.get(patient.user_id)?.permissions.manage_patients;
  };

  // Psychologists the admin can create/edit patients for
  const managablePsychs = useMemo(() => {
    if (!isClinic) return [];
    return members
      .filter((m) => m.permissions.manage_patients)
      .map((m) => ({ userId: m.psychologist_user_id, name: m.profiles?.full_name ?? "Psicóloga" }));
  }, [isClinic, members]);

  const canCreateAny = !isClinic || managablePsychs.length > 0;

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setNewPatientPsychId(isClinic ? patient.user_id : undefined);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPatient(null);
    // Pre-select if only one managable psych
    setNewPatientPsychId(
      isClinic && managablePsychs.length === 1 ? managablePsychs[0].userId : undefined,
    );
    setDialogOpen(true);
  };

  // Reset pagination when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleToggleStatus = async (patient: Patient) => {
    const newStatus = patient.status === "active" ? "inactive" : "active";
    try {
      await updatePatient.mutateAsync({ id: patient.id, status: newStatus });
      toast.success(newStatus === "inactive" ? "Paciente inativado" : "Paciente reativado");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const profilePath = (id: string) =>
    isClinic ? `/clinic/patients/${id}` : `/patients/${id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            {isClinic
              ? selectedMember
                ? `Pacientes de ${selectedMember.profiles?.full_name ?? "Psicóloga"}`
                : "Todos os pacientes da clínica"
              : "Gerencie seus pacientes"}
          </p>
        </div>
        {canCreateAny && (
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo paciente
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente..."
          className="pl-9"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {isLoading ? (
        <SkeletonList count={5} />
      ) : !patients?.length ? (
          <EmptyState
            icon={Users}
            title={search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            description={
              search
                ? "Tente buscar com outro termo ou cadastre um novo paciente."
                : isClinic
                ? "Os pacientes aparecerão aqui conforme as permissões concedidas pelas psicólogas."
                : "Comece cadastrando seu primeiro paciente para organizar suas sessões e finanças."
            }
            actionLabel={!search && canCreateAny ? "Cadastrar primeiro paciente" : undefined}
            onAction={!search && canCreateAny ? handleNew : undefined}
          />
        ) : (
          <>
            <div className="grid gap-3">
              {patients.map((patient) => {
            const canManage = canManagePatient(patient);
            const psychName = isClinic
              ? (memberByUserId.get(patient.user_id)?.profiles?.full_name ?? "Psicóloga")
              : null;
            return (
              <Card
                key={patient.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => navigate(profilePath(patient.id))}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {patient.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{patient.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {patient.phone || patient.email || "Sem contato"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {psychName && !selectedMember && (
                      <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                        {psychName}
                      </Badge>
                    )}
                    <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                      {patient.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); navigate(profilePath(patient.id)); }}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Ver perfil
                        </DropdownMenuItem>
                        {canManage && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleEdit(patient); }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(patient); }}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              {patient.status === "active" ? "Inativar" : "Reativar"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
            <span>
              Mostrando {Math.min(patients.length + page * 20, total)} de {total} paciente{total !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              {page > 0 && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
              )}
              {hasMore && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Carregar mais
                </Button>
              )}
            </div>
          </div>
        )}
          </>
        )}

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        targetUserId={newPatientPsychId}
        availablePsychs={isClinic && !editingPatient ? managablePsychs : undefined}
      />
    </div>
  );
}
