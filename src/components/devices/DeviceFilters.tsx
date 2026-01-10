import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeviceCategory, DeviceStatus, Location } from '@/lib/supabase-types';
import { Search } from 'lucide-react';

interface DeviceFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: DeviceStatus | 'all';
  onStatusChange: (value: DeviceStatus | 'all') => void;
  category: string | 'all';
  onCategoryChange: (value: string) => void;
  location: string | 'all';
  onLocationChange: (value: string) => void;
  categories: DeviceCategory[];
  locations: Location[];
}

export function DeviceFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  location,
  onLocationChange,
  categories,
  locations,
}: DeviceFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar equipamentos..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={status} onValueChange={(v) => onStatusChange(v as DeviceStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os estados</SelectItem>
          <SelectItem value="available">Disponível</SelectItem>
          <SelectItem value="in_use">Em uso</SelectItem>
          <SelectItem value="maintenance">Manutenção</SelectItem>
          <SelectItem value="unavailable">Indisponível</SelectItem>
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={location} onValueChange={onLocationChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Localização" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as localizações</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
