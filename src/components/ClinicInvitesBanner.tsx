import {usePendingInvitesForMe, useRespondToInvite} from "@/hooks/useClinicInvites";
import {supabase} from "@/integrations/supabase/client";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Building2, CheckCircle2, XCircle} from "lucide-react";
import {toast} from "sonner";

/**
 * Banner shown to psychologists when they have pending clinic invites.
 * Rendered inside AppLayout so it appears on every page.
 */
export function ClinicInvitesBanner() {
  const { data: invites = [] } = usePendingInvitesForMe();
  const respondToInvite = useRespondToInvite();

  if (invites.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pt-2">
      {invites.map((inv) => (
        <Card key={inv.id} className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-3">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                <strong>{inv.clinics?.name ?? "Uma clínica"}</strong> quer gerenciar sua agenda
              </p>
              <p className="text-xs text-muted-foreground">
                Você pode aceitar ou recusar — altere permissões a qualquer momento nas configurações.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                disabled={respondToInvite.isPending}
                onClick={async () => {
                  try {
                    await respondToInvite.mutateAsync({
                      inviteId: inv.id,
                      status: "rejected",
                      clinicId: inv.clinic_id,
                      adminUserId: "", // not needed for reject
                      permissions: inv.permissions,
                    });
                    toast.success("Convite recusado");
                  } catch (err: any) {
                    toast.error("Erro", { description: err.message });
                  }
                }}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Recusar
              </Button>
              <Button
                size="sm"
                disabled={respondToInvite.isPending}
                onClick={async () => {
                  try {
                    // Fetch the clinic's owner_id so we can create the member record.
                    // The RLS policy "Invited users can view clinic info" must be applied.
                    const { data: clinicData, error: clinicError } = await supabase
                      .from("clinics" as any)
                      .select("owner_id")
                      .eq("id", inv.clinic_id)
                      .single();

                    if (clinicError || !clinicData) {
                      throw new Error(
                        "Não foi possível obter os dados da clínica. Verifique se as migrações do banco foram aplicadas."
                      );
                    }

                    const adminUserId = (clinicData as { owner_id: string }).owner_id;
                    if (!adminUserId) throw new Error("ID do administrador não encontrado.");

                    await respondToInvite.mutateAsync({
                      inviteId: inv.id,
                      status: "accepted",
                      clinicId: inv.clinic_id,
                      adminUserId,
                      permissions: inv.permissions,
                    });
                    toast.success("Convite aceito! A clínica agora pode gerenciar sua agenda.");
                  } catch (err: unknown) {
                    toast.error("Erro ao aceitar convite", { description: (err as Error).message });
                  }
                }}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Aceitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



