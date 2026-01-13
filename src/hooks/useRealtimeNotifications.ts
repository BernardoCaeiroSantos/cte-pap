import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeNotifications() {
  const { user, isStaff } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          // Notify staff about new reservations
          if (isStaff) {
            toast({
              title: '📅 Nova Reserva',
              description: 'Foi submetida uma nova reserva para aprovação.',
            });
            queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          const newData = payload.new as { user_id: string; status: string };
          
          // Notify user about their reservation status change
          if (newData.user_id === user.id) {
            const statusMessages: Record<string, string> = {
              approved: '✅ A sua reserva foi aprovada!',
              rejected: '❌ A sua reserva foi rejeitada.',
              cancelled: '🚫 A sua reserva foi cancelada.',
            };
            
            if (statusMessages[newData.status]) {
              toast({
                title: 'Atualização de Reserva',
                description: statusMessages[newData.status],
              });
              queryClient.invalidateQueries({ queryKey: ['reservations'] });
            }
          }
          
          // Invalidate admin queries
          if (isStaff) {
            queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'issues',
        },
        (payload) => {
          // Notify staff about new issues
          if (isStaff) {
            toast({
              title: '🔧 Nova Avaria',
              description: 'Foi reportada uma nova avaria.',
            });
            queryClient.invalidateQueries({ queryKey: ['admin-issues'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'issues',
        },
        (payload) => {
          const newData = payload.new as { reported_by: string; status: string };
          
          // Notify user about their issue status change
          if (newData.reported_by === user.id && newData.status === 'resolved') {
            toast({
              title: '✅ Avaria Resolvida',
              description: 'A avaria que reportou foi resolvida.',
            });
            queryClient.invalidateQueries({ queryKey: ['issues'] });
          }
          
          // Invalidate admin queries
          if (isStaff) {
            queryClient.invalidateQueries({ queryKey: ['admin-issues'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isStaff, toast, queryClient]);
}
