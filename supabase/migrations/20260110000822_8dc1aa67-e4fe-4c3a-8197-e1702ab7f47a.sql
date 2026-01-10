-- =============================================
-- 1. IP ADDRESS ANONYMIZATION FUNCTION
-- =============================================

-- Function to anonymize IP addresses by zeroing last octet (IPv4) or last 80 bits (IPv6)
CREATE OR REPLACE FUNCTION public.anonymize_ip(ip_address inet)
RETURNS inet
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF ip_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- For IPv4: mask to /24 (anonymize last octet)
  -- For IPv6: mask to /48 (anonymize last 80 bits)
  IF family(ip_address) = 4 THEN
    RETURN set_masklen(ip_address, 24);
  ELSE
    RETURN set_masklen(ip_address, 48);
  END IF;
END;
$$;

-- Function to anonymize old IP addresses (older than 30 days)
CREATE OR REPLACE FUNCTION public.anonymize_old_ips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retention_cutoff timestamptz := now() - interval '30 days';
BEGIN
  -- Anonymize IPs in access_logs
  UPDATE public.access_logs
  SET ip_address = host(anonymize_ip(ip_address::inet))
  WHERE timestamp < retention_cutoff
    AND ip_address IS NOT NULL
    AND ip_address NOT LIKE '%/24'
    AND ip_address NOT LIKE '%/48'
    AND ip_address NOT LIKE '%.0';

  -- Anonymize IPs in security_audit_log
  UPDATE public.security_audit_log
  SET ip_address = anonymize_ip(ip_address)
  WHERE created_at < retention_cutoff
    AND ip_address IS NOT NULL
    AND masklen(ip_address) NOT IN (24, 48);

  -- Anonymize IPs in active_sessions (for historical sessions)
  UPDATE public.active_sessions
  SET ip_address = anonymize_ip(ip_address)
  WHERE created_at < retention_cutoff
    AND ip_address IS NOT NULL
    AND is_valid = false
    AND masklen(ip_address) NOT IN (24, 48);
END;
$$;

-- =============================================
-- 2. SESSION TOKEN HASHING
-- =============================================

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash session tokens using SHA-256
CREATE OR REPLACE FUNCTION public.hash_session_token(token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(token, 'sha256'), 'hex');
$$;

-- Function to validate a session token against stored hash
CREATE OR REPLACE FUNCTION public.validate_session_token(
  p_user_id uuid,
  p_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.active_sessions
    WHERE user_id = p_user_id
      AND session_token = hash_session_token(p_token)
      AND is_valid = true
      AND expires_at > now()
  );
$$;

-- Trigger to auto-hash session tokens on insert
CREATE OR REPLACE FUNCTION public.hash_session_token_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only hash if the token doesn't look already hashed (64 hex chars)
  IF NEW.session_token IS NOT NULL AND length(NEW.session_token) != 64 THEN
    NEW.session_token := hash_session_token(NEW.session_token);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS hash_session_token_on_insert ON public.active_sessions;
CREATE TRIGGER hash_session_token_on_insert
  BEFORE INSERT ON public.active_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_session_token_trigger();

-- =============================================
-- 3. ADD PRIVACY COMPLIANCE TRACKING
-- =============================================

-- Add column to track when IP was anonymized
ALTER TABLE public.access_logs 
ADD COLUMN IF NOT EXISTS ip_anonymized_at timestamptz;

ALTER TABLE public.security_audit_log 
ADD COLUMN IF NOT EXISTS ip_anonymized_at timestamptz;

-- Update anonymization function to track when anonymization occurred
CREATE OR REPLACE FUNCTION public.anonymize_old_ips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retention_cutoff timestamptz := now() - interval '30 days';
BEGIN
  -- Anonymize IPs in access_logs
  UPDATE public.access_logs
  SET 
    ip_address = host(anonymize_ip(ip_address::inet)),
    ip_anonymized_at = now()
  WHERE timestamp < retention_cutoff
    AND ip_address IS NOT NULL
    AND ip_anonymized_at IS NULL;

  -- Anonymize IPs in security_audit_log
  UPDATE public.security_audit_log
  SET 
    ip_address = anonymize_ip(ip_address),
    ip_anonymized_at = now()
  WHERE created_at < retention_cutoff
    AND ip_address IS NOT NULL
    AND ip_anonymized_at IS NULL;

  -- Anonymize IPs in active_sessions (for expired sessions only)
  UPDATE public.active_sessions
  SET ip_address = anonymize_ip(ip_address)
  WHERE created_at < retention_cutoff
    AND ip_address IS NOT NULL
    AND is_valid = false
    AND masklen(ip_address) NOT IN (24, 48);
END;
$$;

-- Grant execute permission to authenticated users for validation function
GRANT EXECUTE ON FUNCTION public.validate_session_token(uuid, text) TO authenticated;