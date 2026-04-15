import {useState} from "react";
import {type Package, useDeletePackage, usePackages, useUpdatePackage} from "@/hooks/usePackages";
import {useRealtimeSubscription} from "@/hooks/useRealtimeSubscription";
import {PackageFormDialog} from "@/components/PackageFormDialog";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {toast} from "sonner";
import {PackageIcon, Pencil, Plus, ToggleLeft, ToggleRight, Trash2} from "lucide-react";

interface PatientPackagesProps {
  patientId: string;
}

export function PatientPackages({ patientId }: PatientPackagesProps) {
  const { data: packages, isLoading } = usePackages(patientId);
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);

  useRealtimeSubscription("packages", [["packages", patientId]]);

  const handleToggleActive = async (pkg: Package) => {
    try {
      await updatePackage.mutateAsync({ id: pkg.id, active: !pkg.active });
      toast.success(pkg.active ? "Pacote desativado" : "Pacote ativado");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePackage.mutateAsync(id);
      toast.success("Pacote excluído");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {packages?.length ? `${packages.length} pacote(s)` : "Nenhum pacote vinculado"}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3 w-3" /> Vincular pacote
        </Button>
      </div>

      {packages?.map((pkg) => {
        const usagePercent = pkg.total_sessions > 0 ? (pkg.sessions_used / pkg.total_sessions) * 100 : 0;
        const remaining = pkg.total_sessions - pkg.sessions_used;
        const isExhausted = remaining <= 0;

        return (
          <Card key={pkg.id} className={!pkg.active ? "opacity-60" : ""}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <PackageIcon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{pkg.name}</span>
                  <Badge variant={pkg.active ? (isExhausted ? "secondary" : "default") : "secondary"}>
                    {!pkg.active ? "Inativo" : isExhausted ? "Esgotado" : "Ativo"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(pkg)}>
                    {pkg.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditPkg(pkg)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Valor/sessão</p>
                  <p className="font-medium">
                    {Number(pkg.session_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor total</p>
                  <p className="font-medium">
                    {Number(pkg.total_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {pkg.sessions_used} de {pkg.total_sessions} sessões usadas
                  </span>
                  <span>{remaining > 0 ? `${remaining} restante(s)` : "Todas usadas"}</span>
                </div>
                <Progress value={usagePercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <PackageFormDialog open={createOpen} onOpenChange={setCreateOpen} patientId={patientId} />
      <PackageFormDialog
        open={!!editPkg}
        onOpenChange={(o) => { if (!o) setEditPkg(null); }}
        patientId={patientId}
        editPackage={editPkg}
      />
    </div>
  );
}
