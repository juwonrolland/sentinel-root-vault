// Mapbox token configuration
// The token is stored as a Supabase secret and needs to be retrieved
// For frontend use, we'll fetch it from an edge function

import { supabase } from '@/integrations/supabase/client';

// Cache for the mapbox token
let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

// Fallback demo token for local development (limited, public token)
const DEMO_TOKEN = 'pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNXh6OGgxZDA5MnMycnF6Z3V2d3Y5dXgifQ.demo';

export async function getMapboxToken(): Promise<string | null> {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken;
  }

  // Return existing fetch promise to avoid duplicate requests
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  // Check environment variable first
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
  if (envToken && envToken !== 'undefined') {
    cachedToken = envToken;
    return cachedToken;
  }

  // Fetch from edge function
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

    if (data?.token) {
      cachedToken = data.token;
      return cachedToken;
    }
  } catch (error) {
    console.warn('Error fetching Mapbox token:', error);
  }

  return null;
}

// Synchronous check for token availability (for initial render)
export function hasMapboxToken(): boolean {
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
  return Boolean(envToken && envToken !== 'undefined') || Boolean(cachedToken);
}

// Clear cached token (useful for testing)
export function clearMapboxTokenCache(): void {
  cachedToken = null;
  tokenFetchPromise = null;
}
