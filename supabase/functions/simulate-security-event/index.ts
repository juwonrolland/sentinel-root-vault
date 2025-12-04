import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const eventTypes = [
  "Unauthorized Access Attempt",
  "Brute Force Attack Detected",
  "SQL Injection Attempt",
  "XSS Attack Blocked",
  "DDoS Traffic Detected",
  "Malware Signature Found",
  "Suspicious Login Activity",
  "Port Scan Detected",
  "Data Exfiltration Attempt",
  "Privilege Escalation Attempt",
  "Phishing Link Clicked",
  "Ransomware Behavior Detected",
  "API Rate Limit Exceeded",
  "Certificate Validation Failed",
  "Anomalous Network Traffic"
];

const severities = ["critical", "high", "medium", "low"] as const;

const descriptions = [
  "Multiple failed authentication attempts from suspicious IP range",
  "Unusual data transfer patterns detected from internal server",
  "Known malicious signature matched in uploaded file",
  "Suspicious outbound connection to known C2 server",
  "Elevated privileges requested without proper authorization",
  "Database query contained potential injection payload",
  "User agent string matches known bot patterns",
  "Geographic anomaly detected in login pattern",
  "Encrypted traffic to blacklisted domain",
  "Memory scraping attempt detected on payment system"
];

const generateIP = () => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate random event
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const sourceIp = generateIP();

    const { data, error } = await supabase
      .from('security_events')
      .insert({
        event_type: eventType,
        severity: severity,
        description: description,
        source_ip: sourceIp,
        detected_at: new Date().toISOString(),
        metadata: {
          simulated: true,
          generator: "test-event-simulator",
          timestamp: Date.now()
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting event:', error);
      throw error;
    }

    console.log('Simulated event created:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Security event simulated successfully",
        event: data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Error in simulate-security-event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
