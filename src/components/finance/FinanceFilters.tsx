import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Download, FileText, Search} from "lucide-react";
import type {Patient} from "@/hooks/usePatients";

export interface FinanceFilterState {
  month: string;
  patientId: string;
  paymentStatus: string;
  search: string;
}

interface FinanceFiltersProps {
  filters: FinanceFilterState;
  onFiltersChange: (filters: FinanceFilterState) => void;
  monthOptions: { value: string; label: string }[];
  patients: Patient[];
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function FinanceFilters({ filters, onFiltersChange, monthOptions, patients, onExportCSV, onExportPDF }: FinanceFiltersProps) {
  const update = (key: keyof FinanceFilterState, value: string) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <Select value={filters.month} onValueChange={(v) => update("month", v)}>
        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {monthOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.patientId} onValueChange={(v) => update("patientId", v)}>
        <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Paciente" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os pacientes</SelectItem>
          {patients.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.paymentStatus} onValueChange={(v) => update("paymentStatus", v)}>
        <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="paid">Pago</SelectItem>
          <SelectItem value="partial">Parcial</SelectItem>
          <SelectItem value="pending">Pendente</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" className="h-9" onClick={onExportCSV}>
        <Download className="h-4 w-4 mr-1" /> CSV
      </Button>
      <Button variant="outline" size="sm" className="h-9" onClick={onExportPDF}>
        <FileText className="h-4 w-4 mr-1" /> PDF
      </Button>
    </div>
  );
}
