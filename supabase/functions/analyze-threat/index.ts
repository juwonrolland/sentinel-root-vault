import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logData } = await req.json();

    if (!logData) {
      throw new Error('Log data is required');
    }

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
            content: `You are a cybersecurity expert AI analyzing system logs and data for potential security threats. 
            Analyze the provided log data and identify:
            1. Threat type (e.g., "Suspicious Login", "DDoS Attack", "Malware Activity", "Data Exfiltration")
            2. Severity (low, medium, high, critical)
            3. Confidence score (0.0 to 1.0)
            4. Detailed analysis
            5. Key indicators (as JSON array)
            
            Respond in JSON format:
            {
              "threat_type": "string",
              "severity": "low|medium|high|critical",
              "confidence_score": 0.95,
              "details": "string",
              "indicators": ["indicator1", "indicator2"]
            }`
          },
          {
            role: 'user',
            content: `Analyze this log data for security threats:\n\n${logData}`
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