-- Criar enum para tipos de utilizador
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'technician', 'admin');

-- Criar enum para estado dos dispositivos
CREATE TYPE public.device_status AS ENUM ('available', 'in_use', 'maintenance', 'unavailable');

-- Criar enum para estado das reservas
CREATE TYPE public.reservation_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');

-- Criar enum para prioridade das avarias
CREATE TYPE public.issue_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Criar enum para estado das avarias
CREATE TYPE public.issue_status AS ENUM ('reported', 'in_progress', 'resolved', 'closed');

-- Tabela de perfis de utilizadores
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de roles de utilizadores (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);

-- Tabela de localizações
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT,
  floor TEXT,
  room TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de categorias de dispositivos
CREATE TABLE public.device_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de dispositivos
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  serial_number TEXT UNIQUE,
  category_id UUID REFERENCES public.device_categories(id),
  location_id UUID REFERENCES public.locations(id),
  status device_status DEFAULT 'available' NOT NULL,
  description TEXT,
  specifications JSONB,
  image_url TEXT,
  purchase_date DATE,
  warranty_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de reservas
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose TEXT,
  status reservation_status DEFAULT 'pending' NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de avarias/problemas
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority issue_priority DEFAULT 'medium' NOT NULL,
  status issue_status DEFAULT 'reported' NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Função para verificar role do utilizador (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é admin ou técnico
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'technician')
  )
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Políticas RLS para user_roles (apenas leitura para utilizadores, escrita para admins)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para locations (visível para todos, editável por staff)
CREATE POLICY "Anyone can view locations" ON public.locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage locations" ON public.locations
  FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Políticas RLS para device_categories
CREATE POLICY "Anyone can view categories" ON public.device_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage categories" ON public.device_categories
  FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Políticas RLS para devices
CREATE POLICY "Anyone can view devices" ON public.devices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage devices" ON public.devices
  FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Políticas RLS para reservations
CREATE POLICY "Users can view own reservations" ON public.reservations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all reservations" ON public.reservations
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Users can create reservations" ON public.reservations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending reservations" ON public.reservations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Staff can manage all reservations" ON public.reservations
  FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Políticas RLS para issues
CREATE POLICY "Users can view own issues" ON public.issues
  FOR SELECT TO authenticated USING (auth.uid() = reported_by);

CREATE POLICY "Staff can view all issues" ON public.issues
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Users can report issues" ON public.issues
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Staff can manage issues" ON public.issues
  FOR ALL TO authenticated USING (public.is_staff(auth.uid()));