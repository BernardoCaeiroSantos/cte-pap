import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { DeviceCard } from '@/components/devices/DeviceCard';
import { DeviceFilters } from '@/components/devices/DeviceFilters';
import { ReservationDialog } from '@/components/reservations/ReservationDialog';
import { IssueDialog } from '@/components/issues/IssueDialog';
import { Device, DeviceCategory, DeviceStatus, Location } from '@/lib/supabase-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Devices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  // Dialogs
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [devicesRes, categoriesRes, locationsRes] = await Promise.all([
      supabase
        .from('devices')
        .select(`
          *,
          category:device_categories(*),
          location:locations(*)
        `)
        .order('name'),
      supabase.from('device_categories').select('*').order('name'),
      supabase.from('locations').select('*').order('name'),
    ]);

    if (devicesRes.data) {
      setDevices(devicesRes.data as unknown as Device[]);
    }
    if (categoriesRes.data) {
      setCategories(categoriesRes.data as DeviceCategory[]);
    }
    if (locationsRes.data) {
      setLocations(locationsRes.data as Location[]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || device.category_id === categoryFilter;
    const matchesLocation = locationFilter === 'all' || device.location_id === locationFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesLocation;
  });

  const handleReserve = (device: Device) => {
    setSelectedDevice(device);
    setReserveDialogOpen(true);
  };

  const handleReportIssue = (device: Device) => {
    setSelectedDevice(device);
    setIssueDialogOpen(true);
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Por favor, faça login para ver os equipamentos.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Equipamentos</h1>
          <p className="text-muted-foreground">Consulte e reserve os equipamentos disponíveis</p>
        </div>

        <DeviceFilters
          search={search}
          onSearchChange={setSearch}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          category={categoryFilter}
          onCategoryChange={setCategoryFilter}
          location={locationFilter}
          onLocationChange={setLocationFilter}
          categories={categories}
          locations={locations}
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-[220px]" />
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum equipamento encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onReserve={() => handleReserve(device)}
                onReportIssue={() => handleReportIssue(device)}
              />
            ))}
          </div>
        )}
      </div>

      <ReservationDialog
        device={selectedDevice}
        open={reserveDialogOpen}
        onOpenChange={setReserveDialogOpen}
        onSuccess={fetchData}
      />

      <IssueDialog
        device={selectedDevice}
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
      />
    </Layout>
  );
}
