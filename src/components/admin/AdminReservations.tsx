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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Search, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ReservationStatus } from "@/lib/supabase-types";
import { exportToCSV, exportToExcel, formatDateForExport } from "@/lib/exportUtils";

const statusLabels: Record<ReservationStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const statusColors: Record<ReservationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function AdminReservations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          device:devices(name),
          profile:profiles!reservations_user_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      userId,
      deviceName,
      startDate,
      endDate,
    }: {
      id: string;
      status: ReservationStatus;
      userId: string;
      deviceName: string;
      startDate: string;
      endDate: string;
    }) => {
      const { error } = await supabase
        .from("reservations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      // Send notification email
      const notificationType =
        status === "approved" ? "reservation_approved" : "reservation_rejected";

      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: notificationType,
            userId,
            details: {
              deviceName,
              startDate: format(new Date(startDate), "dd/MM/yyyy HH:mm", { locale: pt }),
              endDate: format(new Date(endDate), "dd/MM/yyyy HH:mm", { locale: pt }),
            },
          },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      toast.success("Estado da reserva atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar reserva"),
  });

  const handleApprove = (reservation: any) => {
    updateStatusMutation.mutate({
      id: reservation.id,
      status: "approved",
      userId: reservation.user_id,
      deviceName: reservation.device?.name || "",
      startDate: reservation.start_date,
      endDate: reservation.end_date,
    });
  };

  const handleReject = (reservation: any) => {
    updateStatusMutation.mutate({
      id: reservation.id,
      status: "rejected",
      userId: reservation.user_id,
      deviceName: reservation.device?.name || "",
      startDate: reservation.start_date,
      endDate: reservation.end_date,
    });
  };

  // Filter reservations
  const filteredReservations = reservations.filter((reservation: any) => {
    const matchesSearch =
      searchTerm === "" ||
      reservation.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.device?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || reservation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export functions
  const handleExportCSV = () => {
    const exportData = filteredReservations.map((r: any) => ({
      utilizador: r.profile?.full_name || "N/A",
      equipamento: r.device?.name || "N/A",
      inicio: formatDateForExport(r.start_date),
      fim: formatDateForExport(r.end_date),
      estado: statusLabels[r.status as ReservationStatus],
      finalidade: r.purpose || "",
      criado_em: formatDateForExport(r.created_at),
    }));

    exportToCSV(exportData, `reservas_${format(new Date(), "yyyy-MM-dd")}`, {
      utilizador: "Utilizador",
      equipamento: "Equipamento",
      inicio: "Data Início",
      fim: "Data Fim",
      estado: "Estado",
      finalidade: "Finalidade",
      criado_em: "Criado Em",
    });

    toast.success("Relatório CSV exportado!");
  };

  const handleExportExcel = () => {
    const exportData = filteredReservations.map((r: any) => ({
      utilizador: r.profile?.full_name || "N/A",
      equipamento: r.device?.name || "N/A",
      inicio: formatDateForExport(r.start_date),
      fim: formatDateForExport(r.end_date),
      estado: statusLabels[r.status as ReservationStatus],
      finalidade: r.purpose || "",
      criado_em: formatDateForExport(r.created_at),
    }));

    exportToExcel(exportData, `reservas_${format(new Date(), "yyyy-MM-dd")}`, {
      utilizador: "Utilizador",
      equipamento: "Equipamento",
      inicio: "Data Início",
      fim: "Data Fim",
      estado: "Estado",
      finalidade: "Finalidade",
      criado_em: "Criado Em",
    });

    toast.success("Relatório Excel exportado!");
  };

  if (isLoading) {
    return <div className="text-muted-foreground">A carregar reservas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Gestão de Reservas</CardTitle>
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
              placeholder="Pesquisar por utilizador ou equipamento..."
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
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation: any) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">
                    {reservation.profile?.full_name || "N/A"}
                  </TableCell>
                  <TableCell>{reservation.device?.name || "N/A"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {format(new Date(reservation.start_date), "dd/MM/yyyy HH:mm", {
                          locale: pt,
                        })}
                      </div>
                      <div className="text-muted-foreground">
                        até{" "}
                        {format(new Date(reservation.end_date), "dd/MM/yyyy HH:mm", {
                          locale: pt,
                        })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[reservation.status as ReservationStatus]}
                    >
                      {statusLabels[reservation.status as ReservationStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {reservation.status === "pending" && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(reservation)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(reservation)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredReservations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma reserva encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
