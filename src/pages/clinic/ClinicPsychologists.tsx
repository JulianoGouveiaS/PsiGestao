import {useState} from "react";
import {useClinic} from "@/hooks/useClinic";
import {useClinicMembers, useRemoveClinicMember} from "@/hooks/useClinicMembers";
import {useClinicInvites, useRevokeInvite, useSendClinicInvite} from "@/hooks/useClinicInvites";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {toast} from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {CheckCircle2, Clock, Mail, Trash2, UserPlus, Users, XCircle,} from "lucide-react";
import {formatDistanceToNow, parseISO} from "date-fns";
import {ptBR} from "date-fns/locale";

export default function ClinicPsychologists() {
  const { data: clinic } = useClinic();
  const { data: members = [] } = useClinicMembers(clinic?.id);
  const { data: invites = [] } = useClinicInvites(clinic?.id);
  const sendInvite = useSendClinicInvite();
  const revokeInvite = useRevokeInvite();
  const removeMember = useRemoveClinicMember();

  const [email, setEmail] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const resolvedInvites = invites.filter((i) => i.status !== "pending");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    try {
      await sendInvite.mutateAsync({ clinicId: clinic.id, email: email.trim() });
      toast.success(`Convite enviado para ${email}`);
      setEmail("");
    } catch (err: any) {
      toast.error("Erro ao enviar convite", { description: err.message });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Psicólogas</h1>
        <p className="text-sm text-muted-foreground">Gerencie as psicólogas vinculadas à clínica</p>
      </div>

      {/* Send invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" /> Convidar psicóloga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@psicologa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={sendInvite.isPending}>
              {sendInvite.isPending ? "Enviando..." : "Enviar convite"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            A psicóloga receberá uma notificação no sistema para aceitar ou recusar o convite.
          </p>
        </CardContent>
      </Card>

      {/* Active members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Psicólogas ativas ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma psicóloga vinculada ainda.
            </p>
          ) : (
            members.map((m) => {
              const name = m.profiles?.full_name ?? "Psicóloga";
              const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(m.permissions).map(([key, val]) =>
                        val ? (
                          <Badge key={key} variant="secondary" className="text-xs capitalize">
                            {key.replace(/_/g, " ")}
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setRemoveId(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-500" /> Convites pendentes ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-dashed p-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{inv.invited_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Enviado {formatDistanceToNow(parseISO(inv.created_at), { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0">
                  Aguardando
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  title="Cancelar convite"
                  onClick={async () => {
                    try {
                      await revokeInvite.mutateAsync({ inviteId: inv.id, clinicId: clinic!.id });
                      toast.success("Convite cancelado");
                    } catch (err: any) {
                      toast.error("Erro", { description: err.message });
                    }
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {resolvedInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Histórico de convites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resolvedInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-lg p-2 opacity-70">
                {inv.status === "accepted" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                )}
                <p className="flex-1 text-sm text-foreground">{inv.invited_email}</p>
                <Badge variant={inv.status === "accepted" ? "default" : "secondary"} className="text-xs">
                  {inv.status === "accepted" ? "Aceito" : "Recusado"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirm remove */}
      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover psicóloga?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela perderá o acesso ao painel da clínica. Pode ser reconvidada futuramente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!removeId || !clinic) return;
                try {
                  await removeMember.mutateAsync({ memberId: removeId, clinicId: clinic.id });
                  toast.success("Psicóloga removida");
                  setRemoveId(null);
                } catch (err: any) {
                  toast.error("Erro", { description: err.message });
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

