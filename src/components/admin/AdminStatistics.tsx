import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { Monitor, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { pt } from "date-fns/locale";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const statusChartConfig = {
  available: { label: "Disponível", color: "hsl(var(--chart-1))" },
  reserved: { label: "Reservado", color: "hsl(var(--chart-2))" },
  in_use: { label: "Em Uso", color: "hsl(var(--chart-3))" },
  maintenance: { label: "Manutenção", color: "hsl(var(--chart-4))" },
  unavailable: { label: "Indisponível", color: "hsl(var(--chart-5))" },
};

const reservationsChartConfig = {
  reservations: { label: "Reservas", color: "hsl(var(--chart-1))" },
};

const issuesChartConfig = {
  issues: { label: "Avarias", color: "hsl(var(--chart-2))" },
};

export function AdminStatistics() {
  // Device status statistics
  const { data: deviceStats } = useQuery({
    queryKey: ["admin-stats-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("status");

      if (error) throw error;

      const statusCount: Record<string, number> = {};
      data.forEach(device => {
        statusCount[device.status] = (statusCount[device.status] || 0) + 1;
      });

      return Object.entries(statusCount).map(([status, count]) => ({
        status,
        count,
        label: statusChartConfig[status as keyof typeof statusChartConfig]?.label || status,
      }));
    },
  });

  // Category statistics
  const { data: categoryStats } = useQuery({
    queryKey: ["admin-stats-categories"],
    queryFn: async () => {
      const { data: devices, error: devicesError } = await supabase
        .from("devices")
        .select("category_id");

      if (devicesError) throw devicesError;

      const categoryIds = [...new Set(devices.map(d => d.category_id).filter(Boolean))];
      
      const { data: categories } = await supabase
        .from("device_categories")
        .select("id, name")
        .in("id", categoryIds);

      const categoriesMap = new Map(categories?.map(c => [c.id, c.name]) || []);
      const categoryCount: Record<string, number> = {};

      devices.forEach(device => {
        if (device.category_id) {
          const categoryName = categoriesMap.get(device.category_id) || "Sem Categoria";
          categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
        }
      });

      return Object.entries(categoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    },
  });

  // Reservations over time (last 30 days)
  const { data: reservationsTrend } = useQuery({
    queryKey: ["admin-stats-reservations-trend"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from("reservations")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (error) throw error;

      const days = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: new Date(),
      });

      const dailyCount: Record<string, number> = {};
      days.forEach(day => {
        dailyCount[format(day, "yyyy-MM-dd")] = 0;
      });

      data.forEach(reservation => {
        const day = format(new Date(reservation.created_at), "yyyy-MM-dd");
        if (dailyCount[day] !== undefined) {
          dailyCount[day]++;
        }
      });

      return Object.entries(dailyCount).map(([date, count]) => ({
        date: format(new Date(date), "dd/MM", { locale: pt }),
        reservations: count,
      }));
    },
  });

  // Most common issues
  const { data: commonIssues } = useQuery({
    queryKey: ["admin-stats-common-issues"],
    queryFn: async () => {
      const { data: issues, error: issuesError } = await supabase
        .from("issues")
        .select("device_id, title");

      if (issuesError) throw issuesError;

      const deviceIds = [...new Set(issues.map(i => i.device_id))];
      
      const { data: devices } = await supabase
        .from("devices")
        .select("id, name")
        .in("id", deviceIds);

      const devicesMap = new Map(devices?.map(d => [d.id, d.name]) || []);
      const deviceIssueCount: Record<string, number> = {};

      issues.forEach(issue => {
        const deviceName = devicesMap.get(issue.device_id) || "Desconhecido";
        deviceIssueCount[deviceName] = (deviceIssueCount[deviceName] || 0) + 1;
      });

      return Object.entries(deviceIssueCount)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

  // Summary statistics
  const { data: summary } = useQuery({
    queryKey: ["admin-stats-summary"],
    queryFn: async () => {
      const now = new Date();
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      const [devicesResult, reservationsResult, issuesResult, pendingResult] = await Promise.all([
        supabase.from("devices").select("id", { count: "exact", head: true }),
        supabase.from("reservations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startMonth.toISOString())
          .lte("created_at", endMonth.toISOString()),
        supabase.from("issues")
          .select("id", { count: "exact", head: true })
          .in("status", ["reported", "in_progress"]),
        supabase.from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      return {
        totalDevices: devicesResult.count || 0,
        monthlyReservations: reservationsResult.count || 0,
        openIssues: issuesResult.count || 0,
        pendingReservations: pendingResult.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Equipamentos</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalDevices || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.monthlyReservations || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.pendingReservations || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avarias em Aberto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.openIssues || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Estado dos Equipamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={deviceStats || []}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ label, count }) => `${label}: ${count}`}
                >
                  {(deviceStats || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Equipamentos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ category: { label: "Categoria", color: "hsl(var(--chart-1))" }}} className="h-[250px]">
              <BarChart data={categoryStats || []} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Reservations Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas nos Últimos 30 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={reservationsChartConfig} className="h-[250px]">
              <LineChart data={reservationsTrend || []}>
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="reservations" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Most Common Issues by Device */}
        <Card>
          <CardHeader>
            <CardTitle>Equipamentos com Mais Avarias</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={issuesChartConfig} className="h-[250px]">
              <BarChart data={commonIssues || []} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="device" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
