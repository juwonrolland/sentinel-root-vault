-- Create security audit log table for comprehensive monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_category text NOT NULL, -- 'authentication', 'authorization', 'data_access', 'configuration'
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address inet,
  user_agent text,
  resource_accessed text,
  action_performed text,
  success boolean DEFAULT true,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_log_severity ON public.security_audit_log(severity);
CREATE INDEX idx_security_audit_log_event_type ON public.security_audit_log(event_type);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all audit logs"
  ON public.security_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
  ON public.security_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create session tracking table
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_valid boolean DEFAULT true
);

CREATE INDEX idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX idx_active_sessions_expires_at ON public.active_sessions(expires_at);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.active_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.active_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage sessions"
  ON public.active_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create API rate limiting table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  last_request_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

CREATE INDEX idx_api_rate_limits_user_endpoint ON public.api_rate_limits(user_id, endpoint);
CREATE INDEX idx_api_rate_limits_window ON public.api_rate_limits(window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
  ON public.api_rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create compliance tracking table
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL, -- 'GDPR', 'HIPAA', 'SOC2', 'ISO27001', 'OWASP'
  check_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('compliant', 'partial', 'non_compliant', 'not_applicable')),
  last_checked timestamptz DEFAULT now(),
  next_check_due timestamptz,
  findings jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  evidence_links text[],
  checked_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_compliance_checks_type ON public.compliance_checks(check_type);
CREATE INDEX idx_compliance_checks_status ON public.compliance_checks(status);

ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage compliance checks"
  ON public.compliance_checks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to automatically invalidate old sessions
CREATE OR REPLACE FUNCTION invalidate_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.active_sessions
  SET is_valid = false
  WHERE expires_at < now() AND is_valid = true;
END;
$$;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := date_trunc('minute', now()) - (p_window_minutes || ' minutes')::interval;
  
  -- Get current count
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  RETURN v_count < p_max_requests;
END;
$$;