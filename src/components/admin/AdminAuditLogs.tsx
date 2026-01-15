import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Search, History, CalendarIcon, X } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  reservation_approved: "Reserva Aprovada",
  reservation_rejected: "Reserva Rejeitada",
  reservation_cancelled: "Reserva Cancelada",
  role_updated: "Role Alterado",
  issue_status_updated: "Estado de Avaria Atualizado",
  device_created: "Dispositivo Criado",
  device_updated: "Dispositivo Atualizado",
  device_deleted: "Dispositivo Eliminado",
  device_unavailable: "Dispositivo Indisponível",
};

const actionColors: Record<string, string> = {
  reservation_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  reservation_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  reservation_cancelled: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  role_updated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  issue_status_updated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  device_created: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  device_updated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  device_deleted: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  device_unavailable: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const entityLabels: Record<string, string> = {
  reservation: "Reserva",
  user_role: "Role de Utilizador",
  issue: "Avaria",
  device: "Dispositivo",
};

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
  profile?: {
    full_name: string;
  };
}

export function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data: logsData, error: logsError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (logsError) throw logsError;

      // Fetch profiles for user names
      const userIds = [...new Set(logsData.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return logsData.map(log => ({
        ...log,
        profile: profilesMap.get(log.user_id),
      })) as AuditLog[];
    },
  });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;

    // Date range filter
    const logDate = new Date(log.created_at);
    let matchesDateRange = true;
    
    if (startDate && endDate) {
      matchesDateRange = isWithinInterval(logDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      });
    } else if (startDate) {
      matchesDateRange = logDate >= startOfDay(startDate);
    } else if (endDate) {
      matchesDateRange = logDate <= endOfDay(endDate);
    }

    return matchesSearch && matchesAction && matchesEntity && matchesDateRange;
  });

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatChange = (log: AuditLog): string => {
    if (log.action === "role_updated" && log.old_value && log.new_value) {
      return `${(log.old_value as { role?: string }).role || "N/A"} → ${(log.new_value as { role?: string }).role || "N/A"}`;
    }
    if (log.action === "reservation_approved" || log.action === "reservation_rejected") {
      return (log.new_value as { device_name?: string })?.device_name || log.description || "-";
    }
    if (log.action === "issue_status_updated" && log.old_value && log.new_value) {
      return `${(log.old_value as { status?: string }).status || "N/A"} → ${(log.new_value as { status?: string }).status || "N/A"}`;
    }
    return log.description || "-";
  };

  if (isLoading) {
    return <div className="text-muted-foreground">A carregar histórico...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <CardTitle>Histórico de Ações</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por utilizador ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                {Object.entries(entityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: pt }) : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={pt}
                />
              </PopoverContent>
            </Popover>
            <span className="hidden sm:inline text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: pt }) : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  locale={pt}
                />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar datas
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Utilizador</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                      locale: pt,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.profile?.full_name || "Sistema"}
                  </TableCell>
                  <TableCell>
                    <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entityLabels[log.entity_type] || log.entity_type}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {formatChange(log)}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum registo encontrado
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
