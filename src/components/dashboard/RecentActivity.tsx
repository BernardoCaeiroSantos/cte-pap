import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'reservation' | 'issue' | 'device';
  title: string;
  description: string;
  status: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-accent text-accent-foreground',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-destructive/10 text-destructive',
  reported: 'bg-accent text-accent-foreground',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  available: 'bg-green-100 text-green-800',
  in_use: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-accent text-accent-foreground',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  reported: 'Reportada',
  in_progress: 'Em progresso',
  resolved: 'Resolvida',
  available: 'Disponível',
  in_use: 'Em uso',
  maintenance: 'Manutenção',
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem atividade recente
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: pt })}
                  </p>
                </div>
                <Badge className={statusColors[activity.status] || ''} variant="secondary">
                  {statusLabels[activity.status] || activity.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
