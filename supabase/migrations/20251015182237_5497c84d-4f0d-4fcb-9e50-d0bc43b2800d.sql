-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');

-- Create enum for threat severity
CREATE TYPE public.threat_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for incident status
CREATE TYPE public.incident_status AS ENUM ('open', 'investigating', 'contained', 'resolved', 'closed');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create security_events table for monitoring
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity threat_severity NOT NULL,
  source_ip TEXT,
  user_agent TEXT,
  description TEXT,
  metadata JSONB,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create threat_detections table
CREATE TABLE public.threat_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type TEXT NOT NULL,
  severity threat_severity NOT NULL,
  confidence_score DECIMAL(3,2),
  details TEXT,
  indicators JSONB,
  status TEXT DEFAULT 'active',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES auth.users(id)
);

-- Create access_logs table
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sentiment_analysis table
CREATE TABLE public.sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sentiment_score DECIMAL(3,2),
  sentiment_label TEXT,
  keywords TEXT[],
  entities JSONB,
  flagged BOOLEAN DEFAULT false,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity threat_severity NOT NULL,
  status incident_status DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign viewer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for security_events
CREATE POLICY "Authenticated users can view security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Analysts and admins can insert security events"
  ON public.security_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst')
  );

-- RLS Policies for threat_detections
CREATE POLICY "Authenticated users can view threats"
  ON public.threat_detections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Analysts and admins can manage threats"
  ON public.threat_detections FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst')
  );

-- RLS Policies for access_logs
CREATE POLICY "Users can view own access logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all access logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert access logs"
  ON public.access_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for sentiment_analysis
CREATE POLICY "Authenticated users can view sentiment analysis"
  ON public.sentiment_analysis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Analysts and admins can create sentiment analysis"
  ON public.sentiment_analysis FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst')
  );

-- RLS Policies for incidents
CREATE POLICY "Authenticated users can view incidents"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Analysts and admins can create incidents"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Analysts and admins can update incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst')
  );

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_detections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;