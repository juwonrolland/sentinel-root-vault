-- Create pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job that runs daily at 2:00 AM UTC to anonymize old IPs
-- This calls the anonymize_old_ips_with_logging function directly
SELECT cron.schedule(
  'daily-ip-anonymization',
  '0 2 * * *',
  $$
    SELECT public.anonymize_old_ips_with_logging();
  $$
);

-- Create function for role change notifications
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert notification for the affected user
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    NEW.target_user_id,
    'Role Updated',
    'Your role has been changed from ' || COALESCE(NEW.old_role::text, 'none') || ' to ' || NEW.new_role::text,
    'role_change'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to notify on role changes
DROP TRIGGER IF EXISTS on_role_change_notify ON public.role_change_audit;
CREATE TRIGGER on_role_change_notify
  AFTER INSERT ON public.role_change_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_role_change();

-- Create GDPR data deletion function
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  deleted_counts jsonb;
  notifications_count integer := 0;
  access_logs_count integer := 0;
  alert_history_count integer := 0;
  gdpr_requests_count integer := 0;
  incidents_count integer := 0;
BEGIN
  -- Check if the user is requesting deletion of their own data
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own data';
  END IF;

  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  GET DIAGNOSTICS notifications_count = ROW_COUNT;

  -- Delete access logs
  DELETE FROM public.access_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS access_logs_count = ROW_COUNT;

  -- Delete alert history
  DELETE FROM public.alert_history WHERE user_id = p_user_id;
  GET DIAGNOSTICS alert_history_count = ROW_COUNT;

  -- Delete GDPR export requests
  DELETE FROM public.gdpr_export_requests WHERE user_id = p_user_id;
  GET DIAGNOSTICS gdpr_requests_count = ROW_COUNT;

  -- Delete incidents created by user
  DELETE FROM public.incidents WHERE created_by = p_user_id;
  GET DIAGNOSTICS incidents_count = ROW_COUNT;

  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = p_user_id;

  -- Anonymize profile (keep for referential integrity but remove PII)
  UPDATE public.profiles
  SET 
    full_name = 'Deleted User',
    email = 'deleted-' || p_user_id::text || '@deleted.local',
    avatar_url = NULL,
    updated_at = now()
  WHERE id = p_user_id;

  deleted_counts := jsonb_build_object(
    'notifications', notifications_count,
    'access_logs', access_logs_count,
    'alert_history', alert_history_count,
    'gdpr_requests', gdpr_requests_count,
    'incidents', incidents_count
  );

  result := jsonb_build_object(
    'success', true,
    'deleted_at', now(),
    'user_id', p_user_id,
    'deleted_counts', deleted_counts,
    'message', 'Your data has been permanently deleted'
  );

  RETURN result;
END;
$$;

-- Create advanced security functions

-- Rate limiting with sliding window
CREATE OR REPLACE FUNCTION public.check_rate_limit_advanced(
  p_user_id uuid,
  p_endpoint text,
  p_action text DEFAULT 'request',
  p_max_requests integer DEFAULT 100,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_count integer;
  v_window_start timestamptz;
  v_is_allowed boolean;
  v_reset_at timestamptz;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  v_reset_at := now() + (p_window_seconds || ' seconds')::interval;
  
  -- Get current request count in window
  SELECT COUNT(*) INTO v_current_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND last_request_at >= v_window_start;
  
  v_is_allowed := v_current_count < p_max_requests;
  
  -- Record the request attempt
  IF v_is_allowed THEN
    INSERT INTO public.api_rate_limits (user_id, endpoint, request_count, last_request_at, window_start)
    VALUES (p_user_id, p_endpoint || ':' || p_action, 1, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET request_count = api_rate_limits.request_count + 1,
        last_request_at = now();
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_is_allowed,
    'current_count', v_current_count,
    'max_requests', p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_current_count),
    'reset_at', v_reset_at
  );
END;
$$;

-- Security event correlation function
CREATE OR REPLACE FUNCTION public.correlate_security_events(
  p_time_window_minutes integer DEFAULT 5,
  p_min_events integer DEFAULT 3
)
RETURNS TABLE (
  source_ip text,
  event_count bigint,
  severity_max text,
  event_types text[],
  first_event timestamptz,
  last_event timestamptz,
  is_attack boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.source_ip,
    COUNT(*)::bigint as event_count,
    MAX(se.severity::text) as severity_max,
    array_agg(DISTINCT se.event_type) as event_types,
    MIN(se.detected_at) as first_event,
    MAX(se.detected_at) as last_event,
    (COUNT(*) >= p_min_events AND 
     MAX(se.detected_at) - MIN(se.detected_at) < (p_time_window_minutes || ' minutes')::interval) as is_attack
  FROM public.security_events se
  WHERE se.source_ip IS NOT NULL
    AND se.detected_at > now() - (p_time_window_minutes * 2 || ' minutes')::interval
  GROUP BY se.source_ip
  HAVING COUNT(*) >= p_min_events
  ORDER BY COUNT(*) DESC;
END;
$$;

-- IP reputation scoring function
CREATE OR REPLACE FUNCTION public.get_ip_reputation(p_ip text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_count integer;
  v_threat_count integer;
  v_severity_score integer;
  v_reputation_score integer;
  v_last_seen timestamptz;
  v_event_types text[];
BEGIN
  -- Count events from this IP
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE severity IN ('high', 'critical')),
    MAX(detected_at),
    array_agg(DISTINCT event_type)
  INTO v_event_count, v_threat_count, v_last_seen, v_event_types
  FROM public.security_events
  WHERE source_ip = p_ip
    AND detected_at > now() - interval '30 days';

  -- Calculate severity score
  SELECT COALESCE(SUM(
    CASE severity
      WHEN 'critical' THEN 40
      WHEN 'high' THEN 20
      WHEN 'medium' THEN 5
      WHEN 'low' THEN 1
      ELSE 0
    END
  ), 0)::integer INTO v_severity_score
  FROM public.security_events
  WHERE source_ip = p_ip
    AND detected_at > now() - interval '30 days';

  -- Calculate reputation (100 = good, 0 = bad)
  v_reputation_score := GREATEST(0, 100 - v_severity_score - (v_event_count * 2));

  RETURN jsonb_build_object(
    'ip', p_ip,
    'reputation_score', v_reputation_score,
    'event_count', v_event_count,
    'threat_count', v_threat_count,
    'severity_score', v_severity_score,
    'last_seen', v_last_seen,
    'event_types', COALESCE(v_event_types, ARRAY[]::text[]),
    'risk_level', 
      CASE 
        WHEN v_reputation_score >= 80 THEN 'low'
        WHEN v_reputation_score >= 50 THEN 'medium'
        WHEN v_reputation_score >= 20 THEN 'high'
        ELSE 'critical'
      END,
    'checked_at', now()
  );
END;
$$;