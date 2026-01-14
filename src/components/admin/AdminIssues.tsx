import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wrench, Search, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { IssueStatus, IssuePriority } from "@/lib/supabase-types";
import { exportToCSV, exportToExcel, formatDateForExport } from "@/lib/exportUtils";

const statusLabels: Record<IssueStatus, string> = {
  reported: "Reportado",
  in_progress: "Em Progresso",
  resolved: "Resolvido",
  closed: "Fechado",
};

const statusColors: Record<IssueStatus, string> = {
  reported: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const priorityLabels: Record<IssuePriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const priorityColors: Record<IssuePriority, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function AdminIssues() {
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<IssueStatus>("reported");
  const [resolution, setResolution] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const queryClient = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["admin-issues"],
    queryFn: async () => {
      // Fetch issues
      const { data: issuesData, error: issuesError } = await supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (issuesError) throw issuesError;

      // Fetch related devices and profiles
      const deviceIds = [...new Set(issuesData.map(i => i.device_id))];
      const reporterIds = [...new Set(issuesData.map(i => i.reported_by))];

      const [devicesResult, profilesResult] = await Promise.all([
        supabase.from("devices").select("id, name").in("id", deviceIds),
        supabase.from("profiles").select("user_id, full_name").in("user_id", reporterIds),
      ]);

      const devicesMap = new Map(devicesResult.data?.map(d => [d.id, d]) || []);
      const profilesMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);

      return issuesData.map(i => ({
        ...i,
        device: devicesMap.get(i.device_id),
        reporter: profilesMap.get(i.reported_by),
      }));
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      resolution,
      reportedBy,
      issueTitle,
    }: {
      id: string;
      status: IssueStatus;
      resolution: string;
      reportedBy: string;
      issueTitle: string;
    }) => {
      const updateData: any = { status };
      if (status === "resolved") {
        updateData.resolution = resolution;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("issues")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Send notification if resolved
      if (status === "resolved") {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "issue_resolved",
              userId: reportedBy,
              details: {
                issueTitle,
                resolution,
              },
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
      toast.success("Avaria atualizada com sucesso!");
      setSelectedIssue(null);
      setResolution("");
    },
    onError: () => toast.error("Erro ao atualizar avaria"),
  });

  const handleUpdate = () => {
    if (!selectedIssue) return;

    updateIssueMutation.mutate({
      id: selectedIssue.id,
      status: newStatus,
      resolution,
      reportedBy: selectedIssue.reported_by,
      issueTitle: selectedIssue.title,
    });
  };

  const openUpdateDialog = (issue: any) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setResolution(issue.resolution || "");
  };

  // Filter issues
  const filteredIssues = issues.filter((issue: any) => {
    const matchesSearch =
      searchTerm === "" ||
      issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.device?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.reporter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Export functions
  const handleExportCSV = () => {
    const exportData = filteredIssues.map((i: any) => ({
      titulo: i.title,
      equipamento: i.device?.name || "N/A",
      reportado_por: i.reporter?.full_name || "N/A",
      prioridade: priorityLabels[i.priority as IssuePriority],
      estado: statusLabels[i.status as IssueStatus],
      descricao: i.description || "",
      resolucao: i.resolution || "",
      criado_em: formatDateForExport(i.created_at),
      resolvido_em: formatDateForExport(i.resolved_at),
    }));

    exportToCSV(exportData, `avarias_${format(new Date(), "yyyy-MM-dd")}`, {
      titulo: "Título",
      equipamento: "Equipamento",
      reportado_por: "Reportado Por",
      prioridade: "Prioridade",
      estado: "Estado",
      descricao: "Descrição",
      resolucao: "Resolução",
      criado_em: "Criado Em",
      resolvido_em: "Resolvido Em",
    });

    toast.success("Relatório CSV exportado!");
  };

  const handleExportExcel = () => {
    const exportData = filteredIssues.map((i: any) => ({
      titulo: i.title,
      equipamento: i.device?.name || "N/A",
      reportado_por: i.reporter?.full_name || "N/A",
      prioridade: priorityLabels[i.priority as IssuePriority],
      estado: statusLabels[i.status as IssueStatus],
      descricao: i.description || "",
      resolucao: i.resolution || "",
      criado_em: formatDateForExport(i.created_at),
      resolvido_em: formatDateForExport(i.resolved_at),
    }));

    exportToExcel(exportData, `avarias_${format(new Date(), "yyyy-MM-dd")}`, {
      titulo: "Título",
      equipamento: "Equipamento",
      reportado_por: "Reportado Por",
      prioridade: "Prioridade",
      estado: "Estado",
      descricao: "Descrição",
      resolucao: "Resolução",
      criado_em: "Criado Em",
      resolvido_em: "Resolvido Em",
    });

    toast.success("Relatório Excel exportado!");
  };

  if (isLoading) {
    return <div className="text-muted-foreground">A carregar avarias...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Gestão de Avarias</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por título, equipamento ou utilizador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue: any) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {issue.title}
                    </TableCell>
                    <TableCell>{issue.device?.name || "N/A"}</TableCell>
                    <TableCell>{issue.reporter?.full_name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[issue.priority as IssuePriority]}>
                        {priorityLabels[issue.priority as IssuePriority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[issue.status as IssueStatus]}>
                        {statusLabels[issue.status as IssueStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(issue.created_at), "dd/MM/yyyy", {
                        locale: pt,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openUpdateDialog(issue)}
                      >
                        <Wrench className="h-4 w-4 mr-1" />
                        Atualizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredIssues.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma avaria encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Avaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{selectedIssue?.title}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedIssue?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={newStatus}
                onValueChange={(value: IssueStatus) => setNewStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(newStatus === "resolved" || newStatus === "closed") && (
              <div className="space-y-2">
                <Label>Resolução</Label>
                <Textarea
                  placeholder="Descreva como a avaria foi resolvida..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedIssue(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
