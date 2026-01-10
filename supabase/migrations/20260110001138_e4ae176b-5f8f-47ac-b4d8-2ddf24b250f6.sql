-- Fix search_path for functions - need to fully qualify pgcrypto functions

-- Fix anonymize_ip function with search_path
CREATE OR REPLACE FUNCTION public.anonymize_ip(ip_address inet)
RETURNS inet
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
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

-- Fix hash_session_token function - use extensions schema for digest
CREATE OR REPLACE FUNCTION public.hash_session_token(token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(token, 'sha256'), 'hex');
$$;