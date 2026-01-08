import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_LOG_DATA_LENGTH = 50000;

// Sanitize string input to prevent injection
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, MAX_LOG_DATA_LENGTH);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { logData } = requestBody;

    // Validate logData
    if (!logData || typeof logData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Log data is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (logData.length > MAX_LOG_DATA_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Log data exceeds maximum length of ${MAX_LOG_DATA_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize logData
    const sanitizedLogData = sanitizeString(logData);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Analyzing threat data with AI...');

    // Call Lovable AI for threat analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an elite cybersecurity threat analyst with professional-grade expertise in log forensics, threat intelligence, and advanced attack pattern recognition. Your analysis must be 100% accurate, detailed, and actionable for security operations centers (SOCs).

CRITICAL REQUIREMENTS:
- Provide precise, evidence-based threat assessments
- Use professional security industry terminology
- Include detailed technical analysis with specific indicators
- Identify exact attack vectors and threat patterns
- Provide actionable incident response recommendations
- Flag only genuine threats with concrete supporting evidence

ANALYSIS FRAMEWORK:
For the provided log data, perform comprehensive security analysis and identify:

1. THREAT CLASSIFICATION: Precise threat type with attack taxonomy (e.g., "Credential Stuffing Attack", "Distributed Denial of Service", "Advanced Persistent Threat", "Ransomware Activity", "Data Exfiltration", "Privilege Escalation", "Lateral Movement", "Command & Control Communication")

2. SEVERITY ASSESSMENT: Accurate risk classification (low, medium, high, critical) based on business impact and technical indicators

3. CONFIDENCE METRICS: Evidence-based confidence score (0.0 to 1.0) reflecting certainty of assessment

4. TECHNICAL ANALYSIS: Detailed forensic breakdown including:
   - Attack timeline and progression
   - Affected systems and scope
   - Threat actor TTPs (Tactics, Techniques, and Procedures)
   - Exploitation methods and vulnerabilities
   - Potential business impact

5. THREAT INDICATORS: Specific technical indicators of compromise (IOCs) including:
   - IP addresses, domains, file hashes
   - Suspicious patterns and anomalies
   - Attack signatures and behavioral markers
   
6. INCIDENT RESPONSE: Actionable containment and remediation steps

Respond in JSON format:
{
  "threat_type": "Professional threat classification",
  "severity": "low|medium|high|critical",
  "confidence_score": 0.95,
  "details": "Comprehensive technical analysis with evidence and business impact",
  "indicators": ["specific_ioc_1", "specific_ioc_2", "behavioral_pattern"],
  "affected_systems": ["system identifiers if detectable"],
  "recommended_actions": ["immediate step 1", "containment step 2", "remediation step 3"]
}`
          },
          {
            role: 'user',
            content: `Analyze this log data for security threats:\n\n${sanitizedLogData}`
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add funds to continue.');
      }
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    console.log('AI Analysis:', analysis);

    // Parse AI response
    let threatData;
    try {
      threatData = JSON.parse(analysis);
    } catch (e) {
      console.error('Failed to parse AI response, using defaults');
      threatData = {
        threat_type: 'Unknown Threat',
        severity: 'medium',
        confidence_score: 0.5,
        details: analysis,
        indicators: []
      };
    }

    // Store threat detection
    const { error: insertError } = await supabase
      .from('threat_detections')
      .insert([{
        threat_type: threatData.threat_type,
        severity: threatData.severity,
        confidence_score: threatData.confidence_score,
        details: threatData.details,
        indicators: threatData.indicators,
        assigned_to: user.id
      }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Log security event
    await supabase
      .from('security_events')
      .insert([{
        event_type: 'Threat Analysis',
        severity: threatData.severity,
        description: `AI detected: ${threatData.threat_type}`,
        created_by: user.id
      }]);

    // Log access
    await supabase
      .from('access_logs')
      .insert([{
        user_id: user.id,
        action: 'THREAT_ANALYSIS',
        resource: 'analyze-threat',
        success: true
      }]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Threat analysis completed',
        data: threatData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-threat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});