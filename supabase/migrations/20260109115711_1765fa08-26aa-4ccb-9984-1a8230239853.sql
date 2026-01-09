-- Fix active_sessions: users shouldn't be able to see their own session_token
-- Drop existing SELECT policies and recreate without exposing session_token

-- Create a function to get safe session data (without token)
CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  ip_address inet,
  last_activity timestamptz,
  created_at timestamptz,
  expires_at timestamptz,
  is_valid boolean,
  user_agent text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    ip_address,
    last_activity,
    created_at,
    expires_at,
    is_valid,
    user_agent
  FROM public.active_sessions
  WHERE active_sessions.user_id = p_user_id;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_sessions(uuid) TO authenticated;

-- Fix sentiment_analysis: restrict to analysts/admins only
DROP POLICY IF EXISTS "Authenticated users can view sentiment analysis" ON public.sentiment_analysis;

CREATE POLICY "Admins and analysts can view sentiment analysis"
ON public.sentiment_analysis
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Fix system_health: restrict to analysts/admins only  
DROP POLICY IF EXISTS "Authenticated users can view system health" ON public.system_health;

CREATE POLICY "Admins and analysts can view system health"
ON public.system_health
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Add admin policy for api_rate_limits monitoring
CREATE POLICY "Admins can view all rate limits"
ON public.api_rate_limits
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));