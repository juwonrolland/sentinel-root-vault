-- Fix security_events: restrict SELECT to admins and analysts only
DROP POLICY IF EXISTS "Authenticated users can view security events" ON public.security_events;

CREATE POLICY "Admins and analysts can view security events"
ON public.security_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Fix threat_detections: restrict SELECT to admins and analysts only
DROP POLICY IF EXISTS "Authenticated users can view threats" ON public.threat_detections;

CREATE POLICY "Admins and analysts can view threats"
ON public.threat_detections
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Fix incidents: restrict SELECT to admins and analysts only
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON public.incidents;

CREATE POLICY "Admins and analysts can view incidents"
ON public.incidents
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Fix compliance_reports: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view compliance reports" ON public.compliance_reports;

CREATE POLICY "Admins can view compliance reports"
ON public.compliance_reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix active_sessions: create a view that excludes session_token
-- First, drop existing problematic policies for session tokens
-- Create secure view that excludes session_token
CREATE OR REPLACE VIEW public.active_sessions_safe AS
SELECT 
  id,
  user_id,
  ip_address,
  last_activity,
  created_at,
  expires_at,
  is_valid,
  user_agent
FROM public.active_sessions;

-- Grant access to the view
GRANT SELECT ON public.active_sessions_safe TO authenticated;