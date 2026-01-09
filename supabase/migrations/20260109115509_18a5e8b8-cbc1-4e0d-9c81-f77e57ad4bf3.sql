-- Fix the security definer view issue by recreating it with SECURITY INVOKER
DROP VIEW IF EXISTS public.active_sessions_safe;

CREATE VIEW public.active_sessions_safe 
WITH (security_invoker = true) AS
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