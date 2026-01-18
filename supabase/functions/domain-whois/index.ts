import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Clean domain name
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    console.log(`Looking up domain WHOIS: ${cleanDomain}`);

    const apiKey = Deno.env.get('WHOISXML_API_KEY');
    
    if (!apiKey) {
      console.error('WHOISXML_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'WHOIS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call WhoisXML API
    const response = await fetch(
      `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${cleanDomain}&outputFormat=json`
    );
    
    if (!response.ok) {
      console.error(`WhoisXML API error: ${response.status}`);
      throw new Error(`WHOIS API returned ${response.status}`);
    }

    const data: WhoisResponse = await response.json();
    console.log('WhoisXML response received');

    const record = data.WhoisRecord;
    const registry = record?.registryData;

    // Calculate domain age
    let domainAge = '';
    if (registry?.createdDate) {
      const created = new Date(registry.createdDate);
      const now = new Date();
      const years = Math.floor((now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const months = Math.floor(((now.getTime() - created.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      domainAge = years > 0 ? `${years} years, ${months} months` : `${months} months`;
    }

    // Check if domain is expiring soon
    let expirationWarning = false;
    if (registry?.expiresDate) {
      const expires = new Date(registry.expiresDate);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
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
    };

    console.log(`Successfully resolved WHOIS for ${cleanDomain}`);

    return new Response(
      JSON.stringify({ success: true, data: whoisData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
