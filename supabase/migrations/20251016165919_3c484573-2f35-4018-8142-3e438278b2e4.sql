-- Create system_health table for monitoring system metrics
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  metadata JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Create policies for system_health
CREATE POLICY "Authenticated users can view system health"
  ON public.system_health
  FOR SELECT
  USING (true);

CREATE POLICY "Analysts and admins can insert system health metrics"
  ON public.system_health
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_system_health_metric_name ON public.system_health(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_recorded_at ON public.system_health(recorded_at DESC);

-- Insert sample data for demonstration
INSERT INTO public.system_health (metric_name, metric_value, status, metadata) VALUES
  ('cpu_usage', 45.5, 'healthy', '{"threshold": 80}'::jsonb),
  ('memory_usage', 62.3, 'healthy', '{"threshold": 85}'::jsonb),
  ('network_latency', 23.1, 'healthy', '{"threshold": 100}'::jsonb),
  ('cpu_usage', 88.2, 'warning', '{"threshold": 80}'::jsonb),
  ('memory_usage', 75.4, 'healthy', '{"threshold": 85}'::jsonb),
  ('network_latency', 15.8, 'healthy', '{"threshold": 100}'::jsonb);