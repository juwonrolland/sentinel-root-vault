import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IPInfoResponse {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  asn?: {
    asn: string;
    name: string;
    domain: string;
    route: string;
    type: string;
  };
  company?: {
    name: string;
    domain: string;
    type: string;
  };
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
  };
  abuse?: {
    address: string;
    country: string;
    email: string;
    name: string;
    network: string;
    phone: string;
  };
}

interface FreeAPIResponse {
  status: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
  message?: string;
}

const countryNames: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', DE: 'Germany', FR: 'France',
  JP: 'Japan', CN: 'China', IN: 'India', BR: 'Brazil', AU: 'Australia', RU: 'Russia',
  KR: 'South Korea', IT: 'Italy', ES: 'Spain', MX: 'Mexico', NL: 'Netherlands',
  SE: 'Sweden', CH: 'Switzerland', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
  BE: 'Belgium', AT: 'Austria', PL: 'Poland', IE: 'Ireland', PT: 'Portugal',
  NZ: 'New Zealand', SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan', TH: 'Thailand',
  ID: 'Indonesia', MY: 'Malaysia', PH: 'Philippines', VN: 'Vietnam', AE: 'United Arab Emirates',
  SA: 'Saudi Arabia', IL: 'Israel', ZA: 'South Africa', NG: 'Nigeria', EG: 'Egypt',
  KE: 'Kenya', MA: 'Morocco', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
  UA: 'Ukraine', CZ: 'Czech Republic', RO: 'Romania', HU: 'Hungary', GR: 'Greece', TR: 'Turkey'
};

const continentMap: Record<string, { name: string; code: string }> = {
  US: { name: 'North America', code: 'NA' }, CA: { name: 'North America', code: 'NA' }, MX: { name: 'North America', code: 'NA' },
  GB: { name: 'Europe', code: 'EU' }, DE: { name: 'Europe', code: 'EU' }, FR: { name: 'Europe', code: 'EU' },
  IT: { name: 'Europe', code: 'EU' }, ES: { name: 'Europe', code: 'EU' }, NL: { name: 'Europe', code: 'EU' },
  JP: { name: 'Asia', code: 'AS' }, CN: { name: 'Asia', code: 'AS' }, IN: { name: 'Asia', code: 'AS' },
  KR: { name: 'Asia', code: 'AS' }, SG: { name: 'Asia', code: 'AS' }, HK: { name: 'Asia', code: 'AS' },
  AU: { name: 'Oceania', code: 'OC' }, NZ: { name: 'Oceania', code: 'OC' },
  BR: { name: 'South America', code: 'SA' }, AR: { name: 'South America', code: 'SA' },
  ZA: { name: 'Africa', code: 'AF' }, NG: { name: 'Africa', code: 'AF' }, EG: { name: 'Africa', code: 'AF' },
  RU: { name: 'Europe', code: 'EU' }, UA: { name: 'Europe', code: 'EU' }, TR: { name: 'Europe', code: 'EU' },
};

async function lookupWithIPInfo(ip: string, apiToken: string): Promise<IPInfoResponse | null> {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}?token=${apiToken}`);
    if (!response.ok) {
      console.log(`IPinfo API returned ${response.status}, will try fallback`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('IPinfo lookup failed:', error);
    return null;
  }
}

async function lookupWithFreeAPI(ip: string): Promise<FreeAPIResponse | null> {
  try {
    // Using ip-api.com as fallback (free, no auth required)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`
    );
    if (!response.ok) {
      console.error(`Free API returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.status === 'fail') {
      console.error('Free API failed:', data.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Free API lookup failed:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip } = await req.json();
    
    if (!ip) {
      return new Response(
        JSON.stringify({ success: false, error: 'IP address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up IP: ${ip}`);

    const apiToken = Deno.env.get('IPINFO_API_TOKEN');
    let geoData: Record<string, unknown>;
    let source = 'unknown';

    // Try IPinfo.io first if token is available
    if (apiToken) {
      const ipInfoData = await lookupWithIPInfo(ip, apiToken);
      
      if (ipInfoData) {
        source = 'ipinfo.io';
        
        // Parse location coordinates
        let latitude = 0;
        let longitude = 0;
        if (ipInfoData.loc) {
          const [lat, lon] = ipInfoData.loc.split(',').map(Number);
          latitude = lat;
          longitude = lon;
        }

        // Parse ASN info
        const asnInfo = ipInfoData.org || '';
        const asnMatch = asnInfo.match(/^(AS\d+)\s+(.*)$/);
        const asn = asnMatch ? asnMatch[1] : '';
        const organization = asnMatch ? asnMatch[2] : asnInfo;

        // Get country details
        const countryCode = ipInfoData.country || 'XX';
        const countryName = countryNames[countryCode] || ipInfoData.country || 'Unknown';
        const continent = continentMap[countryCode] || { name: 'Unknown', code: 'XX' };

        geoData = {
          ip: ipInfoData.ip || ip,
          hostname: ipInfoData.hostname || '',
          country: countryName,
          countryCode: countryCode,
          region: ipInfoData.region || '',
          regionName: ipInfoData.region || '',
          city: ipInfoData.city || 'Unknown',
          zip: ipInfoData.postal || '',
          latitude,
          longitude,
          timezone: ipInfoData.timezone || '',
          isp: organization,
          organization: organization,
          org: organization,
          as: asn,
          asn: asn,
          continent: continent.name,
          continentCode: continent.code,
          query: ipInfoData.ip || ip,
          status: 'success',
          source,
          // Extra security info from IPinfo
          privacy: ipInfoData.privacy || null,
          abuse: ipInfoData.abuse || null,
          company: ipInfoData.company || null,
          isVpn: ipInfoData.privacy?.vpn || false,
          isProxy: ipInfoData.privacy?.proxy || false,
          isTor: ipInfoData.privacy?.tor || false,
          isHosting: ipInfoData.privacy?.hosting || false,
        };

        console.log(`Successfully resolved IP ${ip} to ${geoData.city}, ${geoData.country} via IPinfo.io`);
        
        return new Response(
          JSON.stringify({ success: true, data: geoData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback to free API
    console.log('Falling back to free API...');
    const freeData = await lookupWithFreeAPI(ip);
    
    if (freeData) {
      source = 'ip-api.com';
      const countryCode = freeData.countryCode || 'XX';
      const continent = continentMap[countryCode] || { name: 'Unknown', code: 'XX' };

      geoData = {
        ip: ip,
        hostname: '',
        country: freeData.country || 'Unknown',
        countryCode: countryCode,
        region: freeData.region || '',
        regionName: freeData.regionName || '',
        city: freeData.city || 'Unknown',
        zip: freeData.zip || '',
        latitude: freeData.lat || 0,
        longitude: freeData.lon || 0,
        timezone: freeData.timezone || '',
        isp: freeData.isp || 'Unknown ISP',
        organization: freeData.org || '',
        org: freeData.org || '',
        as: freeData.as || '',
        asn: freeData.as || '',
        continent: continent.name,
        continentCode: continent.code,
        query: freeData.query || ip,
        status: 'success',
        source,
        // Free API doesn't have these, so set defaults
        privacy: null,
        abuse: null,
        company: null,
        isVpn: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
      };

      console.log(`Successfully resolved IP ${ip} to ${geoData.city}, ${geoData.country} via ${source}`);
      
      return new Response(
        JSON.stringify({ success: true, data: geoData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Both APIs failed
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to resolve IP address' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('IP geolocation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Geolocation lookup failed';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
