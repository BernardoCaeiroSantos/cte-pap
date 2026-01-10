// Custom types based on database enums and tables
export type UserRole = 'student' | 'teacher' | 'technician' | 'admin';
export type DeviceStatus = 'available' | 'in_use' | 'maintenance' | 'unavailable';
export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'reported' | 'in_progress' | 'resolved' | 'closed';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
}

export interface Location {
  id: string;
  name: string;
  building?: string;
  floor?: string;
  room?: string;
  description?: string;
  created_at: string;
}

export interface DeviceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface Device {
  id: string;
  name: string;
  serial_number?: string;
  category_id?: string;
  location_id?: string;
  status: DeviceStatus;
  description?: string;
  specifications?: Record<string, unknown>;
  image_url?: string;
  purchase_date?: string;
  warranty_until?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: DeviceCategory;
  location?: Location;
}

export interface Reservation {
  id: string;
  device_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  purpose?: string;
  status: ReservationStatus;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  device?: Device;
  user?: Profile;
}

export interface Issue {
  id: string;
  device_id: string;
  reported_by: string;
  assigned_to?: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  device?: Device;
  reporter?: Profile;
  assignee?: Profile;
}
