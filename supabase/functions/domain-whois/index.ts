import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WhoisResponse {
  WhoisRecord?: {
    domainName?: string;
    registryData?: {
      createdDate?: string;
      updatedDate?: string;
      expiresDate?: string;
      registrant?: {
        organization?: string;
        country?: string;
        countryCode?: string;
        state?: string;
        name?: string;
      };
      administrativeContact?: {
        organization?: string;
        country?: string;
        email?: string;
      };
      technicalContact?: {
        organization?: string;
        email?: string;
      };
      nameServers?: {
        hostNames?: string[];
      };
    };
    registrarName?: string;
    registrarIANAID?: string;
    status?: string;
    domainAvailability?: string;
  };
}

// Free WHOIS fallback using RDAP
async function lookupRDAP(domain: string): Promise<Record<string, unknown> | null> {
  try {
    // Try RDAP (Registration Data Access Protocol) - free, no API key needed
    const response = await fetch(`https://rdap.org/domain/${domain}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const events = data.events || [];
    const registrationEvent = events.find((e: any) => e.eventAction === 'registration');
    const expirationEvent = events.find((e: any) => e.eventAction === 'expiration');
    const lastChangedEvent = events.find((e: any) => e.eventAction === 'last changed');
    
    const nameservers = (data.nameservers || []).map((ns: any) => ns.ldhName || '').filter(Boolean);
    
    // Get registrant info from entities
    const registrantEntity = (data.entities || []).find((e: any) => (e.roles || []).includes('registrant'));
    const registrarEntity = (data.entities || []).find((e: any) => (e.roles || []).includes('registrar'));
    
    const registrarName = registrarEntity?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] || 
                         registrarEntity?.publicIds?.[0]?.identifier || 'Unknown';

    let domainAge = '';
    if (registrationEvent?.eventDate) {
      const created = new Date(registrationEvent.eventDate);
      const now = new Date();
      const years = Math.floor((now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const months = Math.floor(((now.getTime() - created.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      domainAge = years > 0 ? `${years} years, ${months} months` : `${months} months`;
    }

    let expirationWarning = false;
    if (expirationEvent?.eventDate) {
      const expires = new Date(expirationEvent.eventDate);
      const daysUntilExpiry = Math.floor((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      expirationWarning = daysUntilExpiry <= 30;
    }

    return {
      domain,
      registrar: registrarName,
      registrarId: registrarEntity?.publicIds?.[0]?.identifier || '',
      createdDate: registrationEvent?.eventDate?.split('T')[0] || 'Unknown',
      updatedDate: lastChangedEvent?.eventDate?.split('T')[0] || 'Unknown',
      expiresDate: expirationEvent?.eventDate?.split('T')[0] || 'Unknown',
      domainAge,
      expirationWarning,
      status: (data.status || []).join(', ') || 'Unknown',
      registrant: {
        organization: 'REDACTED FOR PRIVACY',
        country: 'Unknown',
        state: '',
        name: 'REDACTED FOR PRIVACY',
      },
      administrativeContact: {
        organization: 'REDACTED FOR PRIVACY',
        country: '',
        email: 'REDACTED FOR PRIVACY',
      },
      technicalContact: {
        organization: 'REDACTED FOR PRIVACY',
        email: 'REDACTED FOR PRIVACY',
      },
      nameServers: nameservers,
      available: false,
      source: 'rdap',
    };
  } catch (error) {
    console.error('RDAP lookup failed:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    console.log(`Looking up domain WHOIS: ${cleanDomain}`);

    const apiKey = Deno.env.get('WHOISXML_API_KEY');
    
    // Try WhoisXML API first if key is available
    if (apiKey) {
      try {
        const response = await fetch(
          `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${cleanDomain}&outputFormat=json`
        );
        
        if (response.ok) {
          const data: WhoisResponse = await response.json();
          const record = data.WhoisRecord;
          const registry = record?.registryData;

          let domainAge = '';
          if (registry?.createdDate) {
            const created = new Date(registry.createdDate);
            const now = new Date();
            const years = Math.floor((now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            const months = Math.floor(((now.getTime() - created.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
            domainAge = years > 0 ? `${years} years, ${months} months` : `${months} months`;
          }

          let expirationWarning = false;
          if (registry?.expiresDate) {
            const expires = new Date(registry.expiresDate);
            const daysUntilExpiry = Math.floor((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            expirationWarning = daysUntilExpiry <= 30;
          }

          const whoisData = {
            domain: cleanDomain,
            registrar: record?.registrarName || 'Unknown',
            registrarId: record?.registrarIANAID || '',
            createdDate: registry?.createdDate?.split('T')[0] || 'Unknown',
            updatedDate: registry?.updatedDate?.split('T')[0] || 'Unknown',
            expiresDate: registry?.expiresDate?.split('T')[0] || 'Unknown',
            domainAge,
            expirationWarning,
            status: record?.status || record?.domainAvailability || 'Unknown',
            registrant: {
              organization: registry?.registrant?.organization || 'REDACTED FOR PRIVACY',
              country: registry?.registrant?.country || registry?.registrant?.countryCode || 'Unknown',
              state: registry?.registrant?.state || '',
              name: registry?.registrant?.name || 'REDACTED FOR PRIVACY',
            },
            administrativeContact: {
              organization: registry?.administrativeContact?.organization || 'REDACTED FOR PRIVACY',
              country: registry?.administrativeContact?.country || '',
              email: registry?.administrativeContact?.email || 'REDACTED FOR PRIVACY',
            },
            technicalContact: {
              organization: registry?.technicalContact?.organization || 'REDACTED FOR PRIVACY',
              email: registry?.technicalContact?.email || 'REDACTED FOR PRIVACY',
            },
            nameServers: registry?.nameServers?.hostNames || [],
            available: record?.domainAvailability === 'AVAILABLE',
            source: 'whoisxml',
          };

          console.log(`Successfully resolved WHOIS for ${cleanDomain} via WhoisXML`);
          return new Response(
            JSON.stringify({ success: true, data: whoisData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.warn(`WhoisXML API returned ${response.status}, trying fallback`);
        }
      } catch (err) {
        console.warn('WhoisXML API failed:', err);
      }
    }

    // Fallback to free RDAP lookup
    console.log('Falling back to RDAP lookup...');
    const rdapData = await lookupRDAP(cleanDomain);
    
    if (rdapData) {
      console.log(`Successfully resolved WHOIS for ${cleanDomain} via RDAP`);
      return new Response(
        JSON.stringify({ success: true, data: rdapData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Could not resolve domain WHOIS data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('WHOIS lookup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'WHOIS lookup failed';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
