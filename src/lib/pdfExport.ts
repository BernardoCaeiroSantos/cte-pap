import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface StatsSummary {
  totalDevices: number;
  monthlyReservations: number;
  openIssues: number;
  pendingReservations: number;
}

interface DeviceStatusData {
  status: string;
  count: number;
  label: string;
}

interface CategoryData {
  name: string;
  value: number;
}

interface IssueData {
  device: string;
  count: number;
}

export function exportStatisticsToPDF(
  summary: StatsSummary,
  deviceStats: DeviceStatusData[],
  categoryStats: CategoryData[],
  commonIssues: IssueData[]
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const monthName = format(now, "MMMM yyyy", { locale: pt });
  
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Estatísticas", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${monthName}`, pageWidth / 2, 30, { align: "center" });
  doc.text(`Gerado em: ${format(now, "dd/MM/yyyy HH:mm", { locale: pt })}`, pageWidth / 2, 36, { align: "center" });
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Geral", 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de Equipamentos", summary.totalDevices.toString()],
      ["Reservas Este Mês", summary.monthlyReservations.toString()],
      ["Reservas Pendentes", summary.pendingReservations.toString()],
      ["Avarias em Aberto", summary.openIssues.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  const statusTableY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Estado dos Equipamentos", 14, statusTableY);
  
  autoTable(doc, {
    startY: statusTableY + 5,
    head: [["Estado", "Quantidade"]],
    body: deviceStats.map(d => [d.label, d.count.toString()]),
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] },
  });
  
  const categoryTableY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Categorias de Equipamentos", 14, categoryTableY);
  
  autoTable(doc, {
    startY: categoryTableY + 5,
    head: [["Categoria", "Quantidade"]],
    body: categoryStats.map(c => [c.name, c.value.toString()]),
    theme: "striped",
    headStyles: { fillColor: [139, 92, 246] },
  });
  
  const issuesTableY = (doc as any).lastAutoTable.finalY + 15;
  
  if (issuesTableY > 250) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Equipamentos com Mais Avarias", 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [["Equipamento", "Avarias"]],
      body: commonIssues.map(i => [i.device, i.count.toString()]),
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68] },
    });
  } else {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Equipamentos com Mais Avarias", 14, issuesTableY);
    autoTable(doc, {
      startY: issuesTableY + 5,
      head: [["Equipamento", "Avarias"]],
      body: commonIssues.map(i => [i.device, i.count.toString()]),
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68] },
    });
  }
  
  doc.save(`relatorio_estatisticas_${format(now, "yyyy-MM")}.pdf`);
}
