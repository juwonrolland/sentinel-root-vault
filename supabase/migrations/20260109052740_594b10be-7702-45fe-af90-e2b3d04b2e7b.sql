-- 1. Harden has_role() with explicit NULL validation
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id IS NULL OR _role IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

-- 2. Fix search_path for handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Fix search_path for invalidate_expired_sessions
CREATE OR REPLACE FUNCTION public.invalidate_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.active_sessions
  SET is_valid = false
  WHERE expires_at < now() AND is_valid = true;
END;
$$;

-- 4. Fix search_path for check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_endpoint text, p_max_requests integer, p_window_minutes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := date_trunc('minute', now()) - (p_window_minutes || ' minutes')::interval;
  
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  RETURN v_count < p_max_requests;
END;
$$;

-- 5. Fix overly permissive RLS policies

-- api_rate_limits: Replace "true" policy with user-scoped policy
DROP POLICY IF EXISTS "System can manage rate limits" ON public.api_rate_limits;

CREATE POLICY "Users can view own rate limits"
ON public.api_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert rate limits"
ON public.api_rate_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update rate limits"
ON public.api_rate_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- active_sessions: Replace "true" policy with proper scoping
DROP POLICY IF EXISTS "System can manage sessions" ON public.active_sessions;

CREATE POLICY "Users can manage own sessions"
ON public.active_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- security_audit_log: Restrict insert to authenticated users
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- access_logs: Restrict insert to authenticated users  
DROP POLICY IF EXISTS "System can insert access logs" ON public.access_logs;

CREATE POLICY "Authenticated users can insert access logs"
ON public.access_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- notifications: Restrict insert to user's own notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);