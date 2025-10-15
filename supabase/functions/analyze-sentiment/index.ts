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
    const { content } = await req.json();

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

    console.log('Analyzing sentiment with AI...');

    // Call Lovable AI for sentiment analysis
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
            content: `You are a sentiment analysis AI specialized in security and threat detection.
            Analyze the provided text and identify:
            1. Sentiment (positive, negative, neutral)
            2. Sentiment score (0.0 to 1.0, where 1.0 is most positive)
            3. Key keywords and phrases (array of strings)
            4. Named entities (people, organizations, locations as JSON)
            5. Whether content should be flagged for security review (boolean)
            
            Respond in JSON format:
            {
              "sentiment_label": "positive|negative|neutral",
              "sentiment_score": 0.85,
              "keywords": ["keyword1", "keyword2"],
              "entities": {"people": [], "organizations": [], "locations": []},
              "flagged": false,
              "reason": "explanation if flagged"
            }`
          },
          {
            role: 'user',
            content: `Analyze this text:\n\n${content}`
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

    console.log('AI Sentiment Analysis:', analysis);

    // Parse AI response
    let sentimentData;
    try {
      sentimentData = JSON.parse(analysis);
    } catch (e) {
      console.error('Failed to parse AI response, using defaults');
      sentimentData = {
        sentiment_label: 'neutral',
        sentiment_score: 0.5,
        keywords: [],
        entities: {},
        flagged: false
      };
    }

    // Store sentiment analysis
    const { error: insertError } = await supabase
      .from('sentiment_analysis')
      .insert([{
        content: content.substring(0, 1000), // Limit stored content
        sentiment_score: sentimentData.sentiment_score,
        sentiment_label: sentimentData.sentiment_label,
        keywords: sentimentData.keywords,
        entities: sentimentData.entities,
        flagged: sentimentData.flagged,
        created_by: user.id
      }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // If flagged, create security event
    if (sentimentData.flagged) {
      await supabase
        .from('security_events')
        .insert([{
          event_type: 'Flagged Content',
          severity: 'medium',
          description: `Content flagged for review: ${sentimentData.reason || 'Security concern detected'}`,
          created_by: user.id
        }]);
    }

    // Log access
    await supabase
      .from('access_logs')
      .insert([{
        user_id: user.id,
        action: 'SENTIMENT_ANALYSIS',
        resource: 'analyze-sentiment',
        success: true
      }]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sentiment analysis completed',
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