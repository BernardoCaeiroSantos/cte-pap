import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Reservation, ReservationStatus } from '@/lib/supabase-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
const statusConfig: Record<ReservationStatus, {
  label: string;
  className: string;
}> = {
  pending: {
    label: 'Pendente',
    className: 'bg-accent text-accent-foreground'
  },
  approved: {
    label: 'Aprovada',
    className: 'bg-green-100 text-green-800'
  },
  rejected: {
    label: 'Rejeitada',
    className: 'bg-destructive/10 text-destructive'
  },
  completed: {
    label: 'Concluída',
    className: 'bg-muted text-muted-foreground'
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-muted text-muted-foreground'
  }
};
export default function Reservations() {
  const {
    user
  } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchReservations = async () => {
    if (!user) return;
    setIsLoading(true);
    const {
      data,
      error
    } = await supabase.from('reservations').select(`
        *,
        device:devices(*)
      `).eq('user_id', user.id).order('created_at', {
      ascending: false
    });
    if (error) {
      toast.error('Erro ao carregar reservas');
    } else {
      setReservations(data as unknown as Reservation[]);
    }
    setIsLoading(false);
  };
  useEffect(() => {
    fetchReservations();
  }, [user]);
  const handleCancel = async (reservationId: string) => {
    const {
      error
    } = await supabase.from('reservations').update({
      status: 'cancelled'
    }).eq('id', reservationId);
    if (error) {
      toast.error('Erro ao cancelar reserva');
    } else {
      toast.success('Reserva cancelada');
      fetchReservations();
    }
  };
  if (!user) {
    return <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Por favor, faça login para ver as suas reservas.</p>
        </div>
      </Layout>;
  }
  return <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">As Minhas Reservas</h1>
          <p className="text-muted-foreground">Acompanhe o estado das suas reservas de equipamentos</p>
        </div>

        {isLoading ? <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
          </div> : reservations.length === 0 ? <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ainda não fizeste nenhuma reserva.</p>
            </CardContent>
          </Card> : <div className="space-y-4">
            {reservations.map(reservation => {
          const status = statusConfig[reservation.status];
          return <Card key={reservation.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {reservation.device?.name || 'Equipamento'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(reservation.start_date), "d 'de' MMMM", {
                      locale: pt
                    })} - {format(new Date(reservation.end_date), "d 'de' MMMM 'de' yyyy", {
                      locale: pt
                    })}
                        </p>
                      </div>
                      <Badge className={status.className} variant="secondary">
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {reservation.purpose && <p className="text-sm text-muted-foreground mb-4">
                        {reservation.purpose}
                      </p>}
                    {reservation.status === 'pending' && <Button variant="outline" size="sm" onClick={() => handleCancel(reservation.id)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>}
                  </CardContent>
                </Card>;
        })}
          </div>}
      </div>
    </Layout>;
}