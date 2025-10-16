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
    const { content, analysisType = 'comprehensive' } = await req.json();

    if (!content) {
      throw new Error('Content is required');
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

    console.log('Performing comprehensive forensic NLP analysis...');

    // Enhanced forensic NLP analysis with strategic context
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
            content: `You are an advanced forensic NLP security analyst with expertise in:
            - Deep contextual analysis and linguistic pattern recognition
            - Strategic security threat assessment
            - Copyright infringement detection
            - Sentiment analysis with forensic-level detail
            - Malicious intent detection
            - Social engineering pattern identification
            - Data breach indicators
            - Intellectual property violation markers
            
            Analyze the provided content with forensic precision and provide:
            1. Sentiment (positive, negative, neutral, suspicious, malicious)
            2. Sentiment score (0.0 to 1.0)
            3. Security threat level (none, low, medium, high, critical)
            4. Key forensic keywords and phrases (security-relevant terms)
            5. Named entities (people, organizations, locations, products, brands)
            6. Copyright/IP violation indicators
            7. Malicious intent markers
            8. Social engineering patterns
            9. Data breach risk indicators
            10. Strategic security recommendations
            11. Contextual threat assessment
            12. Red flag warnings for security teams
            
            Respond in JSON format:
            {
              "sentiment_label": "positive|negative|neutral|suspicious|malicious",
              "sentiment_score": 0.85,
              "threat_level": "none|low|medium|high|critical",
              "keywords": ["keyword1", "keyword2"],
              "entities": {
                "people": [],
                "organizations": [],
                "locations": [],
                "products": [],
                "brands": []
              },
              "copyright_indicators": {
                "detected": false,
                "confidence": 0.0,
                "markers": []
              },
              "malicious_indicators": {
                "detected": false,
                "patterns": [],
                "confidence": 0.0
              },
              "social_engineering": {
                "detected": false,
                "tactics": [],
                "confidence": 0.0
              },
              "data_breach_risk": {
                "level": "none|low|medium|high",
                "indicators": []
              },
              "security_recommendations": [],
              "red_flags": [],
              "contextual_analysis": "",
              "flagged": false,
              "reason": "detailed explanation if flagged"
            }`
          },
          {
            role: 'user',
            content: `Perform comprehensive forensic NLP security analysis on this content:\n\n${content}`
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

    console.log('Forensic NLP Analysis Complete:', analysis);

    // Parse AI response
    let sentimentData;
    try {
      sentimentData = JSON.parse(analysis);
    } catch (e) {
      console.error('Failed to parse AI response, using defaults');
      sentimentData = {
        sentiment_label: 'neutral',
        sentiment_score: 0.5,
        threat_level: 'none',
        keywords: [],
        entities: {},
        copyright_indicators: { detected: false, confidence: 0.0, markers: [] },
        malicious_indicators: { detected: false, patterns: [], confidence: 0.0 },
        social_engineering: { detected: false, tactics: [], confidence: 0.0 },
        data_breach_risk: { level: 'none', indicators: [] },
        security_recommendations: [],
        red_flags: [],
        contextual_analysis: '',
        flagged: false
      };
    }

    // Store comprehensive forensic analysis
    const { error: insertError } = await supabase
      .from('sentiment_analysis')
      .insert([{
        content: content.substring(0, 1000),
        sentiment_score: sentimentData.sentiment_score,
        sentiment_label: sentimentData.sentiment_label,
        keywords: sentimentData.keywords,
        entities: sentimentData.entities,
        flagged: sentimentData.flagged || sentimentData.threat_level === 'critical' || sentimentData.threat_level === 'high',
        created_by: user.id
      }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Create security event for any detected threats
    const shouldCreateEvent = sentimentData.flagged || 
                             sentimentData.threat_level === 'high' || 
                             sentimentData.threat_level === 'critical' ||
                             sentimentData.copyright_indicators?.detected ||
                             sentimentData.malicious_indicators?.detected ||
                             sentimentData.social_engineering?.detected;

    if (shouldCreateEvent) {
      const severityMap: { [key: string]: string } = {
        'critical': 'critical',
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
        'none': 'low'
      };

      await supabase
        .from('security_events')
        .insert([{
          event_type: 'Forensic Security Alert',
          severity: severityMap[sentimentData.threat_level] || 'medium',
          description: `Security Analysis Alert: ${sentimentData.reason || 'Multiple security indicators detected'}. Red Flags: ${sentimentData.red_flags?.join(', ') || 'See detailed analysis'}`,
          metadata: {
            threat_level: sentimentData.threat_level,
            copyright_detected: sentimentData.copyright_indicators?.detected,
            malicious_detected: sentimentData.malicious_indicators?.detected,
            social_engineering_detected: sentimentData.social_engineering?.detected,
            recommendations: sentimentData.security_recommendations,
            red_flags: sentimentData.red_flags
          },
          created_by: user.id
        }]);
    }

    // Log access
    await supabase
      .from('access_logs')
      .insert([{
        user_id: user.id,
        action: 'FORENSIC_NLP_ANALYSIS',
        resource: 'analyze-sentiment',
        success: true,
        metadata: {
          threat_level: sentimentData.threat_level,
          analysis_type: analysisType
        }
      }]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Comprehensive forensic analysis completed',
        data: sentimentData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-sentiment function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
