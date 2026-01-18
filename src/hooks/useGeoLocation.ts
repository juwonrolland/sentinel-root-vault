import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GeoLocationData {
  ip: string;
  hostname?: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  organization: string;
  org: string;
  as: string;
  asn: string;
  continent: string;
  continentCode: string;
  query: string;
  status: string;
  message?: string;
  // Enhanced security fields from IPinfo
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  isHosting?: boolean;
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
  } | null;
  abuse?: {
    address: string;
    country: string;
    email: string;
    name: string;
    network: string;
    phone: string;
  } | null;
  company?: {
    name: string;
    domain: string;
    type: string;
  } | null;
}

export interface LocationLookupResult {
  success: boolean;
  data: GeoLocationData | null;
  error: string | null;
}

export interface WhoisData {
  domain: string;
  registrar: string;
  registrarId: string;
  createdDate: string;
  updatedDate: string;
  expiresDate: string;
  domainAge: string;
  expirationWarning: boolean;
  status: string;
  registrant: {
    organization: string;
    country: string;
    state: string;
    name: string;
  };
  administrativeContact: {
    organization: string;
    country: string;
    email: string;
  };
  technicalContact: {
    organization: string;
    email: string;
  };
  nameServers: string[];
  available: boolean;
}

export interface WhoisLookupResult {
  success: boolean;
  data: WhoisData | null;
  error: string | null;
}

const IP_GEOLOCATION_CACHE = new Map<string, GeoLocationData>();
const WHOIS_CACHE = new Map<string, WhoisData>();

export const useGeoLocation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastLookup, setLastLookup] = useState<GeoLocationData | null>(null);

  const lookupIP = useCallback(async (ipAddress: string): Promise<LocationLookupResult> => {
    // Check cache first
    if (IP_GEOLOCATION_CACHE.has(ipAddress)) {
      const cached = IP_GEOLOCATION_CACHE.get(ipAddress)!;
      setLastLookup(cached);
      return { success: true, data: cached, error: null };
    }

    setIsLoading(true);
    
    try {
      // Check if it's a private IP - use fallback for these
      if (isPrivateIP(ipAddress)) {
        const simulatedData = generateLocalNetworkLocation(ipAddress);
        IP_GEOLOCATION_CACHE.set(ipAddress, simulatedData);
        setLastLookup(simulatedData);
        return { success: true, data: simulatedData, error: null };
      }

      // Call our edge function that uses IPinfo.io
      const { data, error } = await supabase.functions.invoke('ip-geolocation', {
        body: { ip: ipAddress }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Geolocation lookup failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Geolocation lookup failed');
      }

      const geoData: GeoLocationData = data.data;
      IP_GEOLOCATION_CACHE.set(ipAddress, geoData);
      setLastLookup(geoData);
      
      console.log(`IP ${ipAddress} resolved to: ${geoData.city}, ${geoData.country}`);
      return { success: true, data: geoData, error: null };

    } catch (error: any) {
      console.error('IP lookup error:', error);
      
      // Fallback to free API if edge function fails
      try {
        const fallbackData = await fallbackIPLookup(ipAddress);
        if (fallbackData) {
          IP_GEOLOCATION_CACHE.set(ipAddress, fallbackData);
          setLastLookup(fallbackData);
          return { success: true, data: fallbackData, error: null };
        }
      } catch (fallbackError) {
        console.error('Fallback lookup also failed:', fallbackError);
      }
      
      return { success: false, data: null, error: error.message || 'Lookup failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lookupDomain = useCallback(async (domain: string): Promise<WhoisLookupResult> => {
    // Clean domain
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    // Check cache first
    if (WHOIS_CACHE.has(cleanDomain)) {
      return { success: true, data: WHOIS_CACHE.get(cleanDomain)!, error: null };
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('domain-whois', {
        body: { domain: cleanDomain }
      });

      if (error) {
        console.error('WHOIS edge function error:', error);
        throw new Error(error.message || 'WHOIS lookup failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'WHOIS lookup failed');
      }

      const whoisData: WhoisData = data.data;
      WHOIS_CACHE.set(cleanDomain, whoisData);
      
      console.log(`Domain ${cleanDomain} WHOIS resolved`);
      return { success: true, data: whoisData, error: null };

    } catch (error: any) {
      console.error('WHOIS lookup error:', error);
      return { success: false, data: null, error: error.message || 'WHOIS lookup failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lookupMultipleIPs = useCallback(async (ipAddresses: string[]): Promise<Map<string, LocationLookupResult>> => {
    const results = new Map<string, LocationLookupResult>();
    
    // Batch lookups with rate limiting
    for (let i = 0; i < ipAddresses.length; i++) {
      const ip = ipAddresses[i];
      const result = await lookupIP(ip);
      results.set(ip, result);
      
      // Rate limit: wait 100ms between requests for IPinfo
      if (i < ipAddresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }, [lookupIP]);

  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }, []);

  const getDistanceBetweenPoints = useCallback((
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const clearCache = useCallback(() => {
    IP_GEOLOCATION_CACHE.clear();
    WHOIS_CACHE.clear();
    setLastLookup(null);
  }, []);

  return {
    lookupIP,
    lookupDomain,
    lookupMultipleIPs,
    getCurrentLocation,
    getDistanceBetweenPoints,
    clearCache,
    isLoading,
    lastLookup,
    cacheSize: IP_GEOLOCATION_CACHE.size,
    whoisCacheSize: WHOIS_CACHE.size,
  };
};

// Helper functions
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  
  // 10.0.0.0 - 10.255.255.255
  if (parts[0] === 10) return true;
  // 172.16.0.0 - 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0 - 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0 - 127.255.255.255
  if (parts[0] === 127) return true;
  
  return false;
}

function generateLocalNetworkLocation(ip: string): GeoLocationData {
  return {
    ip,
    country: 'Local Network',
    countryCode: 'LN',
    region: 'Private',
    regionName: 'Private Network',
    city: 'Local',
    zip: '',
    latitude: 0,
    longitude: 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isp: 'Private Network',
    organization: 'Local Network',
    org: 'Local Network',
    as: 'AS0',
    asn: 'AS0',
    continent: 'Private',
    continentCode: 'XX',
    query: ip,
    status: 'success',
    message: 'Private IP address - location not available',
  };
}

async function fallbackIPLookup(ipAddress: string): Promise<GeoLocationData | null> {
  try {
    // Use ip-api.com as fallback
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.status === 'fail') return null;

    return {
      ip: ipAddress,
      country: data.country || 'Unknown',
      countryCode: data.countryCode || 'XX',
      region: data.region || '',
      regionName: data.regionName || '',
      city: data.city || 'Unknown',
      zip: data.zip || '',
      latitude: data.lat || 0,
      longitude: data.lon || 0,
      timezone: data.timezone || '',
      isp: data.isp || 'Unknown ISP',
      organization: data.org || '',
      org: data.org || '',
      as: data.as || '',
      asn: data.as || '',
      continent: getContinentFromCountryCode(data.countryCode || 'XX'),
      continentCode: getContinentCodeFromCountryCode(data.countryCode || 'XX'),
      query: data.query || ipAddress,
      status: 'success',
    };
  } catch {
    return null;
  }
}

function getContinentFromCountryCode(countryCode: string): string {
  const continentMap: Record<string, string> = {
    US: 'North America', CA: 'North America', MX: 'North America',
    GB: 'Europe', DE: 'Europe', FR: 'Europe', IT: 'Europe', ES: 'Europe', NL: 'Europe', BE: 'Europe', CH: 'Europe', AT: 'Europe', PL: 'Europe', SE: 'Europe', NO: 'Europe', DK: 'Europe', FI: 'Europe', IE: 'Europe', PT: 'Europe', RU: 'Europe',
    JP: 'Asia', CN: 'Asia', IN: 'Asia', KR: 'Asia', SG: 'Asia', HK: 'Asia', TW: 'Asia', TH: 'Asia', ID: 'Asia', MY: 'Asia', PH: 'Asia', VN: 'Asia', AE: 'Asia', SA: 'Asia', IL: 'Asia',
    AU: 'Oceania', NZ: 'Oceania',
    BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America', PE: 'South America',
    ZA: 'Africa', NG: 'Africa', EG: 'Africa', KE: 'Africa', MA: 'Africa',
  };
  return continentMap[countryCode] || 'Unknown';
}

function getContinentCodeFromCountryCode(countryCode: string): string {
  const continentCodeMap: Record<string, string> = {
    US: 'NA', CA: 'NA', MX: 'NA',
    GB: 'EU', DE: 'EU', FR: 'EU', IT: 'EU', ES: 'EU', NL: 'EU', BE: 'EU', CH: 'EU', AT: 'EU', PL: 'EU', SE: 'EU', NO: 'EU', DK: 'EU', FI: 'EU', IE: 'EU', PT: 'EU', RU: 'EU',
    JP: 'AS', CN: 'AS', IN: 'AS', KR: 'AS', SG: 'AS', HK: 'AS', TW: 'AS', TH: 'AS', ID: 'AS', MY: 'AS', PH: 'AS', VN: 'AS', AE: 'AS', SA: 'AS', IL: 'AS',
    AU: 'OC', NZ: 'OC',
    BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA',
    ZA: 'AF', NG: 'AF', EG: 'AF', KE: 'AF', MA: 'AF',
  };
  return continentCodeMap[countryCode] || 'XX';
}
