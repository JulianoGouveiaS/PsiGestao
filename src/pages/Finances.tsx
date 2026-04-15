import {useCallback, useMemo, useState} from "react";
import {useSessions} from "@/hooks/useSessions";
import {useAllPatients} from "@/hooks/usePatients";
import {useRealtimeSubscription} from "@/hooks/useRealtimeSubscription";
import {KpiCards} from "@/components/finance/KpiCards";
import {RevenueChart} from "@/components/finance/RevenueChart";
import {PatientReport} from "@/components/finance/PatientReport";
import {SessionsTable} from "@/components/finance/SessionsTable";
import {FinanceFilters, type FinanceFilterState} from "@/components/finance/FinanceFilters";
import {ForecastCards} from "@/components/finance/ForecastCards";
import {FinanceSkeleton} from "@/components/FinanceSkeleton";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {endOfMonth, endOfWeek, format, isWithinInterval, startOfMonth, startOfWeek, subMonths} from "date-fns";
import {ptBR} from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Finances() {
  const { data: sessions, isLoading } = useSessions();
  const { data: patients } = useAllPatients();

  useRealtimeSubscription("sessions", [["sessions"]]);
  useRealtimeSubscription("payments", [["payments"], ["sessions"]]);

  const [filters, setFilters] = useState<FinanceFilterState>({
    month: "all",
    patientId: "all",
    paymentStatus: "all",
    search: "",
  });

  const monthOptions = useMemo(() => {
    const opts = [{ value: "all", label: "Todos os meses" }];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      opts.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy", { locale: ptBR }),
      });
    }
    return opts;
  }, []);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      // Exclude rescheduled sessions from financial calculations
      if (s.status === "rescheduled") return false;
      // Month
      if (filters.month !== "all") {
        const [year, month] = filters.month.split("-").map(Number);
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(start);
        if (!isWithinInterval(new Date(s.scheduled_at), { start, end })) return false;
      }
      // Patient
      if (filters.patientId !== "all" && s.patient_id !== filters.patientId) return false;
      // Payment status
      if (filters.paymentStatus !== "all") {
        const pStatus = s.payments?.[0]?.status ?? "pending";
        if (pStatus !== filters.paymentStatus) return false;
      }
      // Search
      if (filters.search) {
        const name = s.patients?.full_name?.toLowerCase() ?? "";
        if (!name.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    });
  }, [sessions, filters]);

  const stats = useMemo(() => {
    let totalReceived = 0;
    let totalPending = 0;
    let paidCount = 0;
    let totalAmount = 0;

    filteredSessions.forEach((s) => {
      const p = s.payments?.[0];
      const total = p ? Number(p.total_amount) : Number(s.price);
      const paid = p ? Number(p.amount_paid) : 0;
      totalReceived += paid;
      totalPending += total - paid;
      totalAmount += total;
      if (p?.status === "paid") paidCount++;
    });

    return {
      totalReceived,
      totalPending,
      sessionsCount: filteredSessions.length,
      paidCount,
      avgTicket: filteredSessions.length > 0 ? totalAmount / filteredSessions.length : 0,
    };
  }, [filteredSessions]);

  const forecast = useMemo(() => {
    if (!sessions) return { week: 0, month: 0, weekSessions: 0, monthSessions: 0 };
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let week = 0, month = 0, weekSessions = 0, monthSessions = 0;

    sessions.forEach((s) => {
      if (s.status === "cancelled" || s.status === "rescheduled") return;
      const date = new Date(s.scheduled_at);
      const price = Number(s.price);
      if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
        week += price;
        weekSessions++;
      }
      if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
        month += price;
        monthSessions++;
      }
    });

    return { week, month, weekSessions, monthSessions };
  }, [sessions]);

  const handleExportCSV = useCallback(() => {
    if (filteredSessions.length === 0) return;
    const headers = ["Data", "Paciente", "Valor Total", "Valor Pago", "Restante", "Status"];
    const rows = filteredSessions.map((s) => {
      const p = s.payments?.[0];
      const total = p ? Number(p.total_amount) : Number(s.price);
      const paid = p ? Number(p.amount_paid) : 0;
      return [
        format(new Date(s.scheduled_at), "dd/MM/yyyy HH:mm"),
        s.patients?.full_name ?? "—",
        total.toFixed(2),
        paid.toFixed(2),
        (total - paid).toFixed(2),
        p?.status ?? "pending",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSessions]);

  const handleExportPDF = useCallback(() => {
    if (filteredSessions.length === 0) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 18;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Financeiro", margin, y);
    y += 7;

    // Subtitle / filter info
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    const periodLabel = filters.month === "all"
      ? "Todos os meses"
      : format(new Date(filters.month + "-01"), "MMMM yyyy", { locale: ptBR });
    doc.text(`Período: ${periodLabel}   |   Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // KPI summary row
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageW - margin * 2, 20, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const kpiX = [margin + 4, margin + 50, margin + 100, margin + 140];
    doc.text("Sessões", kpiX[0], y + 7);
    doc.text("Recebido", kpiX[1], y + 7);
    doc.text("Pendente", kpiX[2], y + 7);
    doc.text("Ticket Médio", kpiX[3], y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(String(stats.sessionsCount), kpiX[0], y + 15);
    doc.text(`R$ ${stats.totalReceived.toFixed(2)}`, kpiX[1], y + 15);
    doc.text(`R$ ${stats.totalPending.toFixed(2)}`, kpiX[2], y + 15);
    doc.text(`R$ ${stats.avgTicket.toFixed(2)}`, kpiX[3], y + 15);
    y += 28;

    // Table
    const statusPt: Record<string, string> = {
      paid: "Pago",
      partial: "Parcial",
      pending: "Pendente",
    };

    const tableRows = filteredSessions.map((s) => {
      const p = s.payments?.[0];
      const total = p ? Number(p.total_amount) : Number(s.price);
      const paid = p ? Number(p.amount_paid) : 0;
      return [
        format(new Date(s.scheduled_at), "dd/MM/yyyy HH:mm"),
        s.patients?.full_name ?? "—",
        `R$ ${total.toFixed(2)}`,
        `R$ ${paid.toFixed(2)}`,
        `R$ ${(total - paid).toFixed(2)}`,
        statusPt[p?.status ?? "pending"] ?? "Pendente",
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Data", "Paciente", "Total", "Pago", "Restante", "Status"]],
      body: tableRows,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [79, 70, 229], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 60 },
        2: { cellWidth: 24, halign: "right" },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 20, halign: "center" },
      },
    });

    doc.save(`financeiro_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }, [filteredSessions, filters, stats]);

  if (isLoading) {
    return <FinanceSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Controle completo de receitas e pagamentos</p>
      </div>

      <FinanceFilters
        filters={filters}
        onFiltersChange={setFilters}
        monthOptions={monthOptions}
        patients={patients ?? []}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
      />

      <ForecastCards {...forecast} />

      <KpiCards {...stats} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="patients">Por Paciente</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <RevenueChart sessions={sessions ?? []} monthsBack={6} />
        </TabsContent>

        <TabsContent value="patients">
          <PatientReport sessions={filteredSessions} />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTable sessions={filteredSessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
