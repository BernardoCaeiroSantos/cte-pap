import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DeviceStatusChart } from '@/components/dashboard/DeviceStatusChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, Calendar, AlertTriangle, CheckCircle, Plus, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalDevices: number;
  availableDevices: number;
  pendingReservations: number;
  openIssues: number;
}

export default function Index() {
  const { user, profile, isLoading: authLoading, isStaff } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    availableDevices: 0,
    pendingReservations: 0,
    openIssues: 0,
  });
  const [statusData, setStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: 'reservation' | 'issue' | 'device';
    title: string;
    description: string;
    status: string;
    timestamp: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      setIsLoading(true);

      // Fetch device stats
      const { data: devices } = await supabase
        .from('devices')
        .select('status');

      if (devices) {
        const available = devices.filter(d => d.status === 'available').length;
        const inUse = devices.filter(d => d.status === 'in_use').length;
        const maintenance = devices.filter(d => d.status === 'maintenance').length;
        const unavailable = devices.filter(d => d.status === 'unavailable').length;

        setStats(prev => ({
          ...prev,
          totalDevices: devices.length,
          availableDevices: available,
        }));

        setStatusData([
          { name: 'Disponível', value: available, color: '#22c55e' },
          { name: 'Em uso', value: inUse, color: '#3b82f6' },
          { name: 'Manutenção', value: maintenance, color: '#f59e0b' },
          { name: 'Indisponível', value: unavailable, color: '#ef4444' },
        ]);
      }

      // Fetch reservation stats based on role
      let reservationsQuery = supabase
        .from('reservations')
        .select('id, status')
        .eq('status', 'pending');

      if (!isStaff) {
        reservationsQuery = reservationsQuery.eq('user_id', user.id);
      }

      const { data: reservations } = await reservationsQuery;
      if (reservations) {
        setStats(prev => ({ ...prev, pendingReservations: reservations.length }));
      }

      // Fetch issues stats based on role
      let issuesQuery = supabase
        .from('issues')
        .select('id')
        .in('status', ['reported', 'in_progress']);

      if (!isStaff) {
        issuesQuery = issuesQuery.eq('reported_by', user.id);
      }

      const { data: issues } = await issuesQuery;
      if (issues) {
        setStats(prev => ({ ...prev, openIssues: issues.length }));
      }

      // Fetch recent activity
      let activityQuery = supabase
        .from('reservations')
        .select(`
          id,
          status,
          created_at,
          device:devices(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!isStaff) {
        activityQuery = activityQuery.eq('user_id', user.id);
      }

      const { data: recentReservations } = await activityQuery;
      
      if (recentReservations) {
        const activityItems = recentReservations.map((r: any) => ({
          id: r.id,
          type: 'reservation' as const,
          title: `Reserva: ${r.device?.name || 'Equipamento'}`,
          description: 'Nova reserva criada',
          status: r.status,
          timestamp: r.created_at,
        }));
        setActivities(activityItems);
      }

      setIsLoading(false);
    };

    fetchDashboardData();
  }, [user, isStaff]);

  // Landing page for non-authenticated users
  if (!user && !authLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-3xl text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                <Monitor className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-serif">
              Gestão de Equipamentos Escolares
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simplifique a gestão de equipamentos da sua escola. Reserve dispositivos, 
              reporte avarias e acompanhe o estado em tempo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Começar agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Entrar
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full">
            <Card>
              <CardHeader>
                <Calendar className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Reservas Simples</CardTitle>
                <CardDescription>
                  Reserve equipamentos em segundos e evite conflitos de utilização.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <AlertTriangle className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Reporte de Avarias</CardTitle>
                <CardDescription>
                  Comunique problemas técnicos instantaneamente para resolução rápida.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Monitor className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Dashboard em Tempo Real</CardTitle>
                <CardDescription>
                  Visualize o estado de todos os equipamentos num único lugar.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state
  if (authLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Dashboard for authenticated users
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif">
              Olá, {profile?.full_name?.split(' ')[0] || 'Utilizador'}!
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo ao painel de gestão de equipamentos
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/devices">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Reserva
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total de Equipamentos"
              value={stats.totalDevices}
              icon={Monitor}
            />
            <StatsCard
              title="Disponíveis"
              value={stats.availableDevices}
              description={`${Math.round((stats.availableDevices / stats.totalDevices) * 100) || 0}% do total`}
              icon={CheckCircle}
              trend="up"
            />
            <StatsCard
              title="Reservas Pendentes"
              value={stats.pendingReservations}
              icon={Calendar}
            />
            <StatsCard
              title="Avarias Abertas"
              value={stats.openIssues}
              icon={AlertTriangle}
            />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {isLoading ? (
            <>
              <Skeleton className="h-[350px]" />
              <Skeleton className="h-[350px]" />
            </>
          ) : (
            <>
              <DeviceStatusChart data={statusData} />
              <RecentActivity activities={activities} />
            </>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/devices">
            <Card className="transition-all hover:shadow-md cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Equipamentos
                </CardTitle>
                <CardDescription>
                  Consultar e reservar equipamentos disponíveis
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link to="/reservations">
            <Card className="transition-all hover:shadow-md cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Reservas
                </CardTitle>
                <CardDescription>
                  Ver o estado das suas reservas
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link to="/issues">
            <Card className="transition-all hover:shadow-md cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Avarias
                </CardTitle>
                <CardDescription>
                  Acompanhar avarias reportadas
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
