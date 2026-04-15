import {useState} from "react";
import {PackageTemplatesManager} from "@/components/PackageTemplatesManager";
import {PackageFormDialog} from "@/components/PackageFormDialog";
import {usePackages} from "@/hooks/usePackages";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Progress} from "@/components/ui/progress";
import {SkeletonList} from "@/components/SkeletonList";
import {EmptyState} from "@/components/EmptyState";
import {PackageIcon, Plus} from "lucide-react";

export default function Packages() {
  const { data: packages, isLoading } = usePackages();
  const [createOpen, setCreateOpen] = useState(false);

  const activePackages = packages?.filter((p) => p.active) ?? [];
  const inactivePackages = packages?.filter((p) => !p.active) ?? [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-foreground">Pacotes</h1>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
          <TabsTrigger value="active">
            Pacotes Ativos
            {activePackages.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {activePackages.length}
              </Badge>
            )}
          </TabsTrigger>
          {inactivePackages.length > 0 && (
            <TabsTrigger value="inactive">
              Histórico
              <Badge variant="outline" className="ml-1.5 text-xs">
                {inactivePackages.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <PackageTemplatesManager />
        </TabsContent>

        <TabsContent value="active" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pacotes vinculados a pacientes ativos.
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> Vincular pacote
            </Button>
          </div>

          {isLoading ? (
            <SkeletonList count={4} />
          ) : activePackages.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="Nenhum pacote ativo"
              description="Vincule um pacote a um paciente para acompanhar o progresso das sessões."
              actionLabel="Vincular pacote"
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activePackages.map((pkg) => {
                const pct =
                  pkg.total_sessions > 0
                    ? (pkg.sessions_used / pkg.total_sessions) * 100
                    : 0;
                const remaining = pkg.total_sessions - pkg.sessions_used;
                return (
                  <Card key={pkg.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pkg.patients?.full_name ?? "Paciente"}
                          </p>
                        </div>
                        <Badge
                          variant="default"
                          className="shrink-0 text-xs bg-emerald-600"
                        >
                          Ativo
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {pkg.sessions_used}/{pkg.total_sessions} sessões
                          </span>
                          <span>
                            {remaining} restante{remaining !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          R$ {Number(pkg.session_price).toFixed(2)}/sessão
                        </span>
                        <span>Total: R$ {Number(pkg.total_price).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {inactivePackages.length > 0 && (
          <TabsContent value="inactive" className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inactivePackages.map((pkg) => {
                const pct =
                  pkg.total_sessions > 0
                    ? (pkg.sessions_used / pkg.total_sessions) * 100
                    : 0;
                return (
                  <Card key={pkg.id} className="opacity-70">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pkg.patients?.full_name ?? "Paciente"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Inativo
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {pkg.sessions_used}/{pkg.total_sessions} sessões
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <PackageFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
