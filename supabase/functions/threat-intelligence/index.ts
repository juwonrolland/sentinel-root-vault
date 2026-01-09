import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_TARGET_LENGTH = 500;
const MAX_CONTEXT_LENGTH = 10000;
const VALID_TYPES = ['analyze', 'global_feed', 'ip_reputation', 'domain_check', 'vulnerability_scan'] as const;
const IP_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const DOMAIN_PATTERN = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

interface ThreatIntelRequest {
  type: typeof VALID_TYPES[number];
  target?: string;
  context?: string;
}

// Sanitize string input to prevent injection
function sanitizeString(input: string, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, maxLength);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, target, context } = requestBody as ThreatIntelRequest;

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate target if provided
    if (target && (typeof target !== 'string' || target.length > MAX_TARGET_LENGTH)) {
      return new Response(
        JSON.stringify({ error: `Target must be a string with max ${MAX_TARGET_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate context if provided
    if (context && (typeof context !== 'string' || context.length > MAX_CONTEXT_LENGTH)) {
      return new Response(
        JSON.stringify({ error: `Context must be a string with max ${MAX_CONTEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Additional validation based on type
    if (type === 'ip_reputation' && target) {
      if (!IP_PATTERN.test(target)) {
        return new Response(
          JSON.stringify({ error: 'Invalid IP address format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (type === 'domain_check' && target) {
      if (!DOMAIN_PATTERN.test(target)) {
        return new Response(
          JSON.stringify({ error: 'Invalid domain format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Sanitize inputs
    const sanitizedTarget = target ? sanitizeString(target, MAX_TARGET_LENGTH) : undefined;
    const sanitizedContext = context ? sanitizeString(context, MAX_CONTEXT_LENGTH) : undefined;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case 'analyze':
        systemPrompt = `You are a cybersecurity threat intelligence analyst. Analyze the provided security data and provide detailed threat assessments with:
- Threat severity (critical/high/medium/low)
- Attack vectors identified
- Indicators of Compromise (IoCs)
- Recommended mitigations
- MITRE ATT&CK framework mapping
Respond in JSON format.`;
        userPrompt = `Analyze this security data: ${sanitizedContext}`;
        break;
        
      case 'global_feed':
        systemPrompt = `You are a global cybersecurity threat intelligence feed. Generate realistic, current threat intelligence data including:
- Active threat campaigns worldwide
- Emerging malware families
- Zero-day vulnerabilities
- APT group activities
- Ransomware trends
- Critical infrastructure threats
- Geographic threat distribution
Provide 5-8 current threat items with severity, description, affected regions, and recommended actions. Respond in JSON format with a "threats" array.`;
        userPrompt = `Generate current global threat intelligence feed for ${new Date().toISOString()}. Include realistic threat names, CVE references where applicable, and geographic targeting information.`;
        break;
        
      case 'ip_reputation':
        systemPrompt = `You are an IP reputation analysis system. Analyze the provided IP address and provide:
- Reputation score (0-100, 100 being fully trusted)
- Risk level (critical/high/medium/low/safe)
- Known associations (botnets, malware, spam, scanning)
- Geographic origin
- ISP/ASN information
- Historical activity summary
- Recommended action
Respond in JSON format.`;
        userPrompt = `Analyze IP reputation for: ${sanitizedTarget}`;
        break;
        
      case 'domain_check':
        systemPrompt = `You are a domain threat intelligence system. Analyze the provided domain and provide:
- Reputation score (0-100)
- Risk level (critical/high/medium/low/safe)
- Domain age and registration info
- Known malicious activity
- Phishing indicators
- SSL/TLS certificate analysis
- Related domains
- Recommended action
Respond in JSON format.`;
        userPrompt = `Analyze domain for threats: ${sanitizedTarget}`;
        break;
        
      case 'vulnerability_scan':
        systemPrompt = `You are a vulnerability assessment system. Based on the provided context, generate a vulnerability report including:
- Identified vulnerabilities with CVE IDs
- CVSS scores
- Affected systems
- Exploitation likelihood
- Remediation steps
- Priority ranking
Respond in JSON format with a "vulnerabilities" array.`;
        userPrompt = `Generate vulnerability assessment for: ${sanitizedContext || 'general enterprise network'}`;
        break;
        
      default:
        throw new Error(`Unknown threat intelligence type: ${type}`);
    }

    console.log(`Processing ${type} threat intelligence request`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Try to parse as JSON, or return raw content
    let result;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch {
      result = { raw_response: content };
    }

    console.log(`${type} threat intelligence request completed successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      type,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Threat intelligence error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
