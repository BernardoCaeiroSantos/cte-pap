import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Device, DeviceStatus } from '@/lib/supabase-types';
import { MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DeviceCardProps {
  device: Device;
  onReserve?: () => void;
  onReportIssue?: () => void;
}

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  available: { label: 'Disponível', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  in_use: { label: 'Em uso', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  maintenance: { label: 'Manutenção', className: 'bg-accent text-accent-foreground' },
  unavailable: { label: 'Indisponível', className: 'bg-destructive/10 text-destructive' },
};

export function DeviceCard({ device, onReserve, onReportIssue }: DeviceCardProps) {
  const status = statusConfig[device.status];

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1">{device.name}</CardTitle>
          <Badge className={status.className} variant="secondary">
            {status.label}
          </Badge>
        </div>
        {device.category && (
          <p className="text-sm text-muted-foreground">{device.category.name}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {device.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{device.location.name}</span>
          </div>
        )}
        {device.serial_number && (
          <p className="text-xs text-muted-foreground">
            S/N: {device.serial_number}
          </p>
        )}
        {device.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {device.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 pt-4">
        {device.status === 'available' && onReserve && (
          <Button size="sm" onClick={onReserve} className="flex-1">
            <Calendar className="mr-2 h-4 w-4" />
            Reservar
          </Button>
        )}
        {onReportIssue && (
          <Button size="sm" variant="outline" onClick={onReportIssue}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Reportar
          </Button>
        )}
        <Link to={`/devices/${device.id}`} className="flex-1">
          <Button size="sm" variant="ghost" className="w-full">
            Ver detalhes
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
