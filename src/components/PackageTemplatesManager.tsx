import {useState} from "react";
import {
    type PackageTemplate,
    useCreatePackageTemplate,
    useDeletePackageTemplate,
    usePackageTemplates,
    useUpdatePackageTemplate,
} from "@/hooks/usePackageTemplates";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card, CardContent} from "@/components/ui/card";
import {toast} from "sonner";
import {LayoutTemplate, Pencil, Plus, Trash2} from "lucide-react";

interface TemplateFormState {
  name: string;
  total_sessions: string;
  session_price: string;
  total_price: string;
  lastEdited: "session" | "total";
}

const emptyForm: TemplateFormState = { name: "", total_sessions: "4", session_price: "", total_price: "", lastEdited: "session" };

export function PackageTemplatesManager() {
  const { data: templates, isLoading } = usePackageTemplates();
  const createTemplate = useCreatePackageTemplate();
  const updateTemplate = useUpdatePackageTemplate();
  const deleteTemplate = useDeletePackageTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormState>(emptyForm);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (t: PackageTemplate) => {
    setEditId(t.id);
    const total = t.total_sessions * Number(t.session_price);
    setForm({ name: t.name, total_sessions: String(t.total_sessions), session_price: String(t.session_price), total_price: String(total), lastEdited: "session" });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        total_sessions: parseInt(form.total_sessions),
        session_price: parseFloat(form.session_price),
      };
      if (editId) {
        await updateTemplate.mutateAsync({ id: editId, ...payload });
        toast.success("Modelo atualizado!");
      } else {
        await createTemplate.mutateAsync(payload);
        toast.success("Modelo criado!");
      }
      setFormOpen(false);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Modelo excluído");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleSessionsChange = (val: string) => {
    const sessions = parseInt(val) || 0;
    if (form.lastEdited === "total" && sessions > 0) {
      const total = parseFloat(form.total_price) || 0;
      setForm({ ...form, total_sessions: val, session_price: (total / sessions).toFixed(2) });
    } else {
      const price = parseFloat(form.session_price) || 0;
      setForm({ ...form, total_sessions: val, total_price: (sessions * price).toFixed(2) });
    }
  };

  const handleSessionPriceChange = (val: string) => {
    const sessions = parseInt(form.total_sessions) || 0;
    const price = parseFloat(val) || 0;
    setForm({ ...form, session_price: val, total_price: (sessions * price).toFixed(2), lastEdited: "session" });
  };

  const handleTotalPriceChange = (val: string) => {
    const sessions = parseInt(form.total_sessions) || 0;
    const total = parseFloat(val) || 0;
    setForm({ ...form, total_price: val, session_price: sessions > 0 ? (total / sessions).toFixed(2) : "0", lastEdited: "total" });
  };

  const totalPrice = parseFloat(form.total_price) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Modelos de Pacote</h3>
          <p className="text-sm text-muted-foreground">
            Crie modelos reutilizáveis para vincular rapidamente aos pacientes
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-3 w-3" /> Novo modelo
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && (!templates || templates.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum modelo criado ainda</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
              Criar primeiro modelo
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates?.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{t.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Sessões</p>
                  <p className="font-medium">{t.total_sessions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor/sessão</p>
                  <p className="font-medium">
                    {Number(t.session_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {(t.total_sessions * Number(t.session_price)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Modelo" : "Novo Modelo de Pacote"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pacote Mensal" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº de sessões *</Label>
                <Input type="number" min="1" value={form.total_sessions} onChange={(e) => handleSessionsChange(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Valor/sessão (R$) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="150.00" value={form.session_price} onChange={(e) => handleSessionPriceChange(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor total (R$)</Label>
              <Input type="number" min="0" step="0.01" placeholder="600.00" value={form.total_price} onChange={(e) => handleTotalPriceChange(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                {createTemplate.isPending || updateTemplate.isPending ? "Salvando..." : editId ? "Salvar" : "Criar modelo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
