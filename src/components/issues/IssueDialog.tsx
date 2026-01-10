import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Device, IssuePriority } from '@/lib/supabase-types';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface IssueDialogProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function IssueDialog({ device, open, onOpenChange, onSuccess }: IssueDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!device || !user || !title || !description) return;

    setIsLoading(true);

    const { error } = await supabase.from('issues').insert({
      device_id: device.id,
      reported_by: user.id,
      title,
      description,
      priority,
    });

    if (error) {
      toast.error('Erro ao reportar avaria', { description: error.message });
    } else {
      toast.success('Avaria reportada com sucesso!', {
        description: 'A equipa técnica será notificada.'
      });
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      onSuccess?.();
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reportar Avaria</DialogTitle>
          <DialogDescription>
            {device?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Resumo do problema"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o problema em detalhe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !title || !description}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reportar Avaria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
