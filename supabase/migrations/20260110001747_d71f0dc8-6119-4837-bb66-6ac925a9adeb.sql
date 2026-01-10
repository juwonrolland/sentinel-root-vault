-- =============================================
-- 1. ROLE CHANGE AUDIT TRAIL TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view role change audit
CREATE POLICY "Admins can view role change audit"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert role change audit records
CREATE POLICY "Admins can insert role change audit"
ON public.role_change_audit
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_change_audit_target_user ON public.role_change_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_changed_by ON public.role_change_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_created_at ON public.role_change_audit(created_at DESC);

-- =============================================
-- 2. GDPR DATA EXPORT TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.gdpr_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  export_data jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz
);

-- Enable RLS
ALTER TABLE public.gdpr_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own export requests
CREATE POLICY "Users can view own export requests"
ON public.gdpr_export_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own export requests
CREATE POLICY "Users can create own export requests"
ON public.gdpr_export_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own export requests (for status updates)
CREATE POLICY "Users can update own export requests"
ON public.gdpr_export_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gdpr_export_user ON public.gdpr_export_requests(user_id);

-- =============================================
-- 3. IP ANONYMIZATION LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.anonymization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL, -- 'scheduled', 'manual'
  records_processed integer DEFAULT 0,
  tables_affected jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  error_message text
);

-- Enable RLS
ALTER TABLE public.anonymization_runs ENABLE ROW LEVEL SECURITY;

-- Admins can view anonymization runs
CREATE POLICY "Admins can view anonymization runs"
ON public.anonymization_runs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System/admins can insert anonymization runs
CREATE POLICY "System can insert anonymization runs"
ON public.anonymization_runs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- System/admins can update anonymization runs
CREATE POLICY "System can update anonymization runs"
ON public.anonymization_runs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. ENHANCED ANONYMIZATION FUNCTION WITH LOGGING
-- =============================================

CREATE OR REPLACE FUNCTION public.anonymize_old_ips_with_logging()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  retention_cutoff timestamptz := now() - interval '30 days';
  access_logs_count integer := 0;
  audit_logs_count integer := 0;
  sessions_count integer := 0;
  result jsonb;
BEGIN
  -- Anonymize IPs in access_logs
  WITH updated AS (
    UPDATE public.access_logs
    SET 
      ip_address = host(anonymize_ip(ip_address::inet)),
      ip_anonymized_at = now()
    WHERE timestamp < retention_cutoff
      AND ip_address IS NOT NULL
      AND ip_anonymized_at IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO access_logs_count FROM updated;

  -- Anonymize IPs in security_audit_log
  WITH updated AS (
    UPDATE public.security_audit_log
    SET 
      ip_address = anonymize_ip(ip_address),
      ip_anonymized_at = now()
    WHERE created_at < retention_cutoff
      AND ip_address IS NOT NULL
      AND ip_anonymized_at IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO audit_logs_count FROM updated;

  -- Anonymize IPs in active_sessions (for expired sessions only)
  WITH updated AS (
    UPDATE public.active_sessions
    SET ip_address = anonymize_ip(ip_address)
    WHERE created_at < retention_cutoff
      AND ip_address IS NOT NULL
      AND is_valid = false
      AND masklen(ip_address) NOT IN (24, 48)
    RETURNING 1
  )
  SELECT count(*) INTO sessions_count FROM updated;

  result := jsonb_build_object(
    'access_logs', access_logs_count,
    'security_audit_log', audit_logs_count,
    'active_sessions', sessions_count,
    'total', access_logs_count + audit_logs_count + sessions_count
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.anonymize_old_ips_with_logging() TO authenticated;

-- =============================================
-- 5. GDPR DATA EXPORT FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  profile_data jsonb;
  roles_data jsonb;
  notifications_data jsonb;
  access_logs_data jsonb;
  alert_history_data jsonb;
  sessions_data jsonb;
BEGIN
  -- Check if the user is requesting their own data
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only export your own data';
  END IF;

  -- Get profile data
  SELECT to_jsonb(p.*) INTO profile_data
  FROM public.profiles p
  WHERE p.id = p_user_id;

  -- Get roles data
  SELECT jsonb_agg(to_jsonb(r.*)) INTO roles_data
  FROM public.user_roles r
  WHERE r.user_id = p_user_id;

  -- Get notifications data
  SELECT jsonb_agg(to_jsonb(n.*)) INTO notifications_data
  FROM public.notifications n
  WHERE n.user_id = p_user_id;

  -- Get access logs (anonymized IPs for old records)
  SELECT jsonb_agg(to_jsonb(a.*)) INTO access_logs_data
  FROM public.access_logs a
  WHERE a.user_id = p_user_id;

  -- Get alert history
  SELECT jsonb_agg(to_jsonb(ah.*)) INTO alert_history_data
  FROM public.alert_history ah
  WHERE ah.user_id = p_user_id;

  -- Build result
  result := jsonb_build_object(
    'export_date', now(),
    'user_id', p_user_id,
    'profile', COALESCE(profile_data, '{}'::jsonb),
    'roles', COALESCE(roles_data, '[]'::jsonb),
    'notifications', COALESCE(notifications_data, '[]'::jsonb),
    'access_logs', COALESCE(access_logs_data, '[]'::jsonb),
    'alert_history', COALESCE(alert_history_data, '[]'::jsonb)
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated;