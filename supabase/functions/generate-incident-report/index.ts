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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reportType, dateRange, incidentId, format } = await req.json();

    console.log('Generating incident report:', { reportType, dateRange, incidentId, format });

    let reportData: Record<string, unknown> = {};
    let reportTitle = '';

    if (incidentId) {
      // Single incident detailed report
      const { data: incident } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (!incident) {
        throw new Error('Incident not found');
      }

      const { data: relatedEvents } = await supabase
        .from('security_events')
        .select('*')
        .gte('detected_at', incident.created_at)
        .order('detected_at', { ascending: true })
        .limit(50);

      const { data: threatDetections } = await supabase
        .from('threat_detections')
        .select('*')
        .gte('detected_at', incident.created_at)
        .order('detected_at', { ascending: true })
        .limit(20);

      reportData = {
        incident,
        relatedEvents: relatedEvents || [],
        threatDetections: threatDetections || [],
        reportType: 'incident_detail'
      };
      reportTitle = `Incident Report: ${incident.title}`;

    } else {
      // Summary report for date range
      const startDate = dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.end || new Date().toISOString();

      const [incidents, events, threats, auditLogs] = await Promise.all([
        supabase.from('incidents').select('*').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('security_events').select('*').gte('detected_at', startDate).lte('detected_at', endDate),
        supabase.from('threat_detections').select('*').gte('detected_at', startDate).lte('detected_at', endDate),
        supabase.from('security_audit_log').select('*').gte('created_at', startDate).lte('created_at', endDate).limit(100)
      ]);

      const incidentsBySeverity = (incidents.data || []).reduce((acc: Record<string, number>, inc) => {
        acc[inc.severity] = (acc[inc.severity] || 0) + 1;
        return acc;
      }, {});

      const incidentsByStatus = (incidents.data || []).reduce((acc: Record<string, number>, inc) => {
        acc[inc.status || 'open'] = (acc[inc.status || 'open'] || 0) + 1;
        return acc;
      }, {});

      const eventsByType = (events.data || []).reduce((acc: Record<string, number>, evt) => {
        acc[evt.event_type] = (acc[evt.event_type] || 0) + 1;
        return acc;
      }, {});

      const threatsByType = (threats.data || []).reduce((acc: Record<string, number>, thr) => {
        acc[thr.threat_type] = (acc[thr.threat_type] || 0) + 1;
        return acc;
      }, {});

      reportData = {
        period: { start: startDate, end: endDate },
        summary: {
          totalIncidents: incidents.data?.length || 0,
          totalEvents: events.data?.length || 0,
          totalThreats: threats.data?.length || 0,
          totalAuditLogs: auditLogs.data?.length || 0
        },
        breakdown: {
          incidentsBySeverity,
          incidentsByStatus,
          eventsByType,
          threatsByType
        },
        incidents: incidents.data || [],
        topThreats: (threats.data || []).slice(0, 10),
        recentEvents: (events.data || []).slice(0, 20),
        reportType: reportType || 'executive_summary'
      };
      reportTitle = `Security Report: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }

    // Generate AI-powered executive summary
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
            content: `You are an enterprise security analyst generating professional incident reports for C-level executives, security teams, and compliance officers.

Generate a comprehensive, professional security report with:
1. EXECUTIVE SUMMARY: High-level overview suitable for executives
2. KEY FINDINGS: Most critical security observations
3. RISK ASSESSMENT: Overall risk posture and trends
4. RECOMMENDATIONS: Actionable security improvements
5. COMPLIANCE IMPACT: Regulatory and compliance considerations

Format the report in a professional, structured manner suitable for enterprise documentation.
Use clear headings, bullet points, and metrics where appropriate.
Be concise but thorough.`
          },
          {
            role: 'user',
            content: `Generate a professional security report based on this data:

Title: ${reportTitle}
Report Type: ${reportData.reportType}

Data:
${JSON.stringify(reportData, null, 2)}`
          }
        ]
      })
    });

    let aiSummary = '';
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      aiSummary = aiData.choices[0].message.content;
    }

    // Store the report
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    const periodData = reportData.period as { start?: string; end?: string } | undefined;
    const { data: report, error: reportError } = await supabase
      .from('compliance_reports')
      .insert([{
        report_type: reportData.reportType as string,
        period_start: periodData?.start || new Date().toISOString(),
        period_end: periodData?.end || new Date().toISOString(),
        findings: {
          ...reportData,
          aiSummary,
          generatedAt: new Date().toISOString()
        },
        generated_by: userId || '00000000-0000-0000-0000-000000000000'
      }])
      .select()
      .single();

    if (reportError) {
      console.error('Failed to store report:', reportError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: {
          id: report?.id,
          title: reportTitle,
          type: reportData.reportType,
          data: reportData,
          aiSummary,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
