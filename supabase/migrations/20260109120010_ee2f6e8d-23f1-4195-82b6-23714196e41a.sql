-- Remove direct SELECT policies on active_sessions for users
-- They should use the get_user_sessions() function instead

DROP POLICY IF EXISTS "Users can view own sessions" ON public.active_sessions;

-- Keep admin policy but create a safe admin function too
CREATE OR REPLACE FUNCTION public.get_all_sessions_admin()
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
  FROM public.active_sessions;
$$;

-- Only allow admins to call this function
REVOKE ALL ON FUNCTION public.get_all_sessions_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_sessions_admin() TO authenticated;

-- Update admin SELECT policy to use the function check
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.active_sessions;