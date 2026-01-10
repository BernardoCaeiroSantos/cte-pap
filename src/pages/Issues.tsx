import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Issue, IssueStatus, IssuePriority } from '@/lib/supabase-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<IssueStatus, { label: string; className: string }> = {
  reported: { label: 'Reportada', className: 'bg-accent text-accent-foreground' },
  in_progress: { label: 'Em progresso', className: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'Resolvida', className: 'bg-green-100 text-green-800' },
  closed: { label: 'Fechada', className: 'bg-muted text-muted-foreground' },
};

const priorityConfig: Record<IssuePriority, { label: string; className: string }> = {
  low: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', className: 'bg-accent text-accent-foreground' },
  high: { label: 'Alta', className: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Crítica', className: 'bg-destructive/10 text-destructive' },
};

export default function Issues() {
  const { user, isStaff } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIssues = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    let query = supabase
      .from('issues')
      .select(`
        *,
        device:devices(*)
      `)
      .order('created_at', { ascending: false });

    // Staff can see all issues, regular users only see their own
    if (!isStaff) {
      query = query.eq('reported_by', user.id);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Erro ao carregar avarias');
    } else {
      setIssues(data as unknown as Issue[]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, [user, isStaff]);

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Por favor, faça login para ver as avarias.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">
            {isStaff ? 'Todas as Avarias' : 'As Minhas Avarias'}
          </h1>
          <p className="text-muted-foreground">
            {isStaff 
              ? 'Gerir e resolver avarias reportadas' 
              : 'Acompanhe o estado das avarias que reportou'}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[140px]" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma avaria encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => {
              const status = statusConfig[issue.status];
              const priority = priorityConfig[issue.priority];
              return (
                <Card key={issue.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{issue.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {issue.device?.name} • Reportada em {format(new Date(issue.created_at), "d 'de' MMMM", { locale: pt })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={priority.className} variant="secondary">
                          {priority.label}
                        </Badge>
                        <Badge className={status.className} variant="secondary">
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {issue.description}
                    </p>
                    {issue.resolution && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Resolução:</p>
                        <p className="text-sm text-muted-foreground">{issue.resolution}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
