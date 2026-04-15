import {useEffect, useState} from "react";
import {
    type AnamnesisData,
    emptyAnamnesis,
    useAnamnesis,
    useAnamnesisHistory,
    useSaveAnamnesis
} from "@/hooks/useAnamnesis";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {toast} from "sonner";
import {ChevronDown, ChevronUp, ClipboardList, FileDown, History, Pencil} from "lucide-react";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";
import jsPDF from "jspdf";

const fields: { key: keyof AnamnesisData; label: string; placeholder: string }[] = [
  { key: "chief_complaint", label: "Queixa principal", placeholder: "Motivo da procura por atendimento psicológico..." },
  { key: "personal_history", label: "História pessoal", placeholder: "Infância, adolescência, eventos significativos, traumas..." },
  { key: "family_dynamics", label: "Dinâmica familiar", placeholder: "Estrutura familiar, relações, conflitos, vínculos afetivos..." },
  { key: "emotional_state", label: "Estado emocional atual", placeholder: "Humor, ansiedade, padrões emocionais, sono, apetite..." },
  { key: "social_relationships", label: "Relacionamentos e vida social", placeholder: "Amizades, vida amorosa, isolamento, rede de apoio..." },
  { key: "coping_strategies", label: "Estratégias de enfrentamento", placeholder: "Como lida com estresse, mecanismos de defesa, recursos..." },
  { key: "previous_therapy", label: "Terapias anteriores", placeholder: "Experiências com psicoterapia, abordagens utilizadas, resultados..." },
  { key: "expectations", label: "Expectativas do tratamento", placeholder: "O que espera alcançar com a terapia, objetivos..." },
  { key: "medications", label: "Medicamentos em uso", placeholder: "Medicações psiquiátricas ou outras em uso atual..." },
  { key: "additional_notes", label: "Observações adicionais", placeholder: "Outras informações clínicas relevantes..." },
];

function exportAnamnesisAsPdf(data: AnamnesisData, patientName?: string, savedAt?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Ficha de Anamnese", margin, y);
  y += 8;

  if (patientName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Paciente: ${patientName}`, margin, y);
    y += 6;
  }
  if (savedAt) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Versão salva em: ${savedAt}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  for (const field of fields) {
    const value = data[field.key];
    if (!value) continue;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(field.label, margin, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, contentW);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 4;
  }

  const fileName = patientName
    ? `anamnese_${patientName.replace(/\s+/g, "_").toLowerCase()}.pdf`
    : "anamnese.pdf";
  doc.save(fileName);
}

export function AnamnesisForm({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const { data: existing, isLoading } = useAnamnesis(patientId);
  const { data: history = [] } = useAnamnesisHistory(patientId);
  const saveAnamnesis = useSaveAnamnesis();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<AnamnesisData>(emptyAnamnesis);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<{ data: AnamnesisData; created_at: string } | null>(null);

  useEffect(() => {
    if (existing?.data) {
      setFormData({ ...emptyAnamnesis, ...(existing.data as unknown as AnamnesisData) });
    }
  }, [existing]);

  const hasData = existing?.data && Object.values(existing.data as unknown as AnamnesisData).some((v) => v);

  const handleSave = async () => {
    try {
      await saveAnamnesis.mutateAsync({ patientId, data: formData });
      toast.success("Anamnese salva!");
      setEditing(false);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    }
  };

  const handleExportPdf = (data: AnamnesisData, createdAt?: string) => {
    const savedAt = createdAt
      ? format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : undefined;
    exportAnamnesisAsPdf(data, patientName, savedAt);
  };

  const viewingVersion = selectedVersion ? (selectedVersion.data as AnamnesisData) : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Version viewer
  if (viewingVersion) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <History className="h-3 w-3 mr-1" />
            Versão de {format(new Date(selectedVersion!.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportPdf(viewingVersion, selectedVersion!.created_at)}>
              <FileDown className="h-3 w-3 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedVersion(null)}>
              Voltar
            </Button>
          </div>
        </div>
        {fields.map(({ key, label }) => {
          const value = viewingVersion[key];
          if (!value) return null;
          return (
            <div key={key}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // View mode
  if (hasData && !editing) {
    const data = existing!.data as unknown as AnamnesisData;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Anamnese preenchida</span>
            {history.length > 1 && (
              <Badge variant="secondary" className="text-xs">{history.length} versões</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportPdf(data, existing?.created_at)}>
              <FileDown className="h-3 w-3 mr-1" /> PDF
            </Button>
            {history.length > 1 && (
              <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
                <History className="h-3 w-3 mr-1" />
                {showHistory ? "Ocultar" : "Histórico"}
                {showHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" /> Editar
            </Button>
          </div>
        </div>

        {/* Version history panel */}
        {showHistory && history.length > 1 && (
          <Card className="border-dashed">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico de versões
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1">
              {history.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && <Badge variant="default" className="text-xs">Atual</Badge>}
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(v.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedVersion({ data: v.data as unknown as AnamnesisData, created_at: v.created_at })}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleExportPdf(v.data as unknown as AnamnesisData, v.created_at)}
                    >
                      <FileDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {fields.map(({ key, label }) => {
          const value = data[key];
          if (!value) return null;
          return (
            <div key={key}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // Edit / create mode
  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          <span className="text-sm">Preencha a ficha de anamnese do paciente</span>
        </div>
      )}
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-xs">{label}</Label>
          <Textarea
            placeholder={placeholder}
            value={formData[key]}
            onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saveAnamnesis.isPending}>
          {saveAnamnesis.isPending ? "Salvando..." : "Salvar anamnese"}
        </Button>
        {editing && (
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
