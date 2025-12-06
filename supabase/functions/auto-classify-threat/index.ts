import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  source_ip?: string;
  metadata?: Record<string, unknown>;
  detected_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { event } = await req.json() as { event: SecurityEvent };

    if (!event) {
      throw new Error('Security event is required');
    }

    console.log('Auto-classifying threat for event:', event.id);

    // AI-powered threat classification
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
            content: `You are an elite enterprise security threat classifier for a global security intelligence platform used by organizations, corporations, governments, and international agencies.

CLASSIFICATION FRAMEWORK:
Analyze security events and provide enterprise-grade threat classification for:
- Corporate Networks (SMB to Enterprise)
- Government Infrastructure (Municipal to Federal)
- Critical Infrastructure (Power, Water, Transportation)
- Financial Institutions (Banks, Trading, Insurance)
- Healthcare Systems (Hospitals, Research, Pharma)
- Educational Institutions
- Military & Defense Systems
- International Organizations

THREAT CATEGORIES:
1. MALWARE: Ransomware, Trojans, Worms, Spyware, Rootkits, Cryptominers
2. NETWORK ATTACKS: DDoS, Man-in-the-Middle, DNS Poisoning, ARP Spoofing
3. INTRUSION: Unauthorized Access, Privilege Escalation, Lateral Movement
4. DATA BREACH: Exfiltration, Data Theft, Information Disclosure
5. APT: Advanced Persistent Threats, State-Sponsored Attacks, Zero-Days
6. INSIDER THREAT: Malicious Insider, Compromised Credentials, Sabotage
7. PHISHING: Spear Phishing, Whaling, Business Email Compromise
8. INFRASTRUCTURE: Supply Chain Attack, Third-Party Compromise
9. COMPLIANCE: Policy Violation, Regulatory Breach, Audit Failure

SEVERITY MATRIX:
- CRITICAL: Imminent threat to operations, data breach in progress, APT detected
- HIGH: Active exploitation, significant vulnerability, potential data exposure
- MEDIUM: Suspicious activity, policy violation, failed attack attempt
- LOW: Informational, benign anomaly, routine alert

INCIDENT PRIORITY:
- P1: Immediate response required (Critical severity)
- P2: Response within 1 hour (High severity)
- P3: Response within 4 hours (Medium severity)
- P4: Response within 24 hours (Low severity)

Respond with JSON:
{
  "classification": {
    "category": "Primary threat category",
    "subcategory": "Specific threat type",
    "attack_vector": "Method of attack",
    "threat_actor_type": "nation-state|criminal|hacktivist|insider|unknown"
  },
  "risk_assessment": {
    "severity": "critical|high|medium|low",
    "priority": "P1|P2|P3|P4",
    "confidence": 0.95,
    "potential_impact": "Description of business impact",
    "affected_scope": "network|system|application|data|infrastructure"
  },
  "incident_recommendation": {
    "create_incident": true,
    "title": "Concise incident title",
    "description": "Detailed incident description with context",
    "immediate_actions": ["action1", "action2"],
    "containment_strategy": "Recommended containment approach",
    "escalation_required": true,
    "escalation_level": "SOC|IR Team|CISO|Executive|External"
  },
  "intelligence": {
    "iocs": ["indicator1", "indicator2"],
    "ttps": ["tactic1", "technique1"],
    "mitre_attack_ids": ["T1XXX", "T1YYY"],
    "threat_intel_refs": ["reference sources"]
  }
}`
          },
          {
            role: 'user',
            content: `Classify this security event for enterprise incident response:

Event Type: ${event.event_type}
Severity: ${event.severity}
Description: ${event.description || 'No description provided'}
Source IP: ${event.source_ip || 'Unknown'}
Metadata: ${JSON.stringify(event.metadata || {})}
Detected At: ${event.detected_at}`
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      console.error('AI classification failed:', aiResponse.status);
      throw new Error('AI classification failed');
    }

    const aiData = await aiResponse.json();
    const classificationText = aiData.choices[0].message.content;

    let classification;
    try {
      classification = JSON.parse(classificationText);
    } catch (e) {
      console.error('Failed to parse AI response');
      classification = {
        classification: { category: event.event_type, subcategory: 'Unknown' },
        risk_assessment: { severity: event.severity, priority: 'P3', confidence: 0.5 },
        incident_recommendation: { create_incident: event.severity === 'critical' || event.severity === 'high' }
      };
    }

    console.log('Classification result:', classification);

    // Auto-create incident for critical/high severity events
    if (classification.incident_recommendation?.create_incident) {
      const incidentTitle = classification.incident_recommendation.title || 
        `[AUTO] ${classification.classification.category}: ${event.event_type}`;
      
      const incidentDescription = classification.incident_recommendation.description ||
        `Automated incident created from security event.\n\nEvent: ${event.event_type}\nSeverity: ${event.severity}\nSource: ${event.source_ip || 'Unknown'}\n\n${event.description || ''}`;

      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert([{
          title: incidentTitle,
          description: incidentDescription,
          severity: event.severity,
          status: 'open'
        }])
        .select()
        .single();

      if (incidentError) {
        console.error('Failed to create incident:', incidentError);
      } else {
        console.log('Auto-created incident:', incident.id);

        // Create notification for the incident
        const { data: users } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'analyst']);

        if (users) {
          const notifications = users.map(u => ({
            user_id: u.user_id,
            title: `New ${event.severity.toUpperCase()} Incident`,
            message: incidentTitle,
            type: event.severity === 'critical' ? 'alert' : 'warning'
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }
    }

    // Store classification in threat_detections
    const { error: detectionError } = await supabase
      .from('threat_detections')
      .insert([{
        threat_type: classification.classification?.category || event.event_type,
        severity: event.severity,
        confidence_score: classification.risk_assessment?.confidence || 0.5,
        details: JSON.stringify(classification),
        indicators: classification.intelligence?.iocs || [],
        status: 'active'
      }]);

    if (detectionError) {
      console.error('Failed to store detection:', detectionError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        classification,
        incident_created: classification.incident_recommendation?.create_incident || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-classify-threat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
