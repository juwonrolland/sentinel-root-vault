// Mapbox token configuration
import { supabase } from '@/integrations/supabase/client';

let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

// Validate that a token looks like a real Mapbox token
function isValidMapboxToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith('pk.') && token.length > 30;
}

export async function getMapboxToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (tokenFetchPromise) return tokenFetchPromise;

  // Check environment variable first
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
  if (envToken && envToken !== 'undefined' && isValidMapboxToken(envToken)) {
    cachedToken = envToken;
    return cachedToken;
  }

  tokenFetchPromise = fetchTokenFromEdge();
  const result = await tokenFetchPromise;
  tokenFetchPromise = null;
  return result;
}

async function fetchTokenFromEdge(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    
    if (error) {
      console.warn('Failed to fetch Mapbox token:', error);
      return null;
    }

    if (data?.token && isValidMapboxToken(data.token)) {
      cachedToken = data.token;
      return cachedToken;
    }
    
    console.warn('Mapbox token is not valid. Token must start with "pk." — got:', data?.token?.substring(0, 10));
    return null;
  } catch (error) {
    console.warn('Error fetching Mapbox token:', error);
  }
  return null;
}

export function hasMapboxToken(): boolean {
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
  return (Boolean(envToken && envToken !== 'undefined') && isValidMapboxToken(envToken)) || Boolean(cachedToken);
}

export function clearMapboxTokenCache(): void {
  cachedToken = null;
  tokenFetchPromise = null;
}
