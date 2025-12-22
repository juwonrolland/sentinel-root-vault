import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'network_registered' | 'threat_detected' | 'threat_resolved' | 'network_verified' | 'security_alert' | 'daily_report';
  recipients: string[];
  data: {
    networkName?: string;
    networkRange?: string;
    sector?: string;
    location?: string;
    contactPerson?: string;
    threatType?: string;
    threatSeverity?: string;
    deviceName?: string;
    deviceIp?: string;
    threatDetails?: string;
    remediationSteps?: string[];
    timestamp?: string;
    geoLocation?: {
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      isp?: string;
      organization?: string;
    };
    metrics?: {
      totalDevices?: number;
      activeThreats?: number;
      resolvedThreats?: number;
      uptime?: number;
    };
  };
}

const getEmailTemplate = (type: string, data: NotificationRequest['data']): { subject: string; html: string } => {
  const timestamp = data.timestamp || new Date().toISOString();
  const formattedTime = new Date(timestamp).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const baseStyles = `
    <style>
      .container { font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%); color: #e0e0e0; border-radius: 12px; overflow: hidden; }
      .header { background: linear-gradient(90deg, #00ff88 0%, #00d4ff 100%); padding: 20px 30px; }
      .header h1 { color: #0a0a1a; margin: 0; font-size: 24px; font-weight: 700; }
      .content { padding: 30px; }
      .alert-box { background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); border-radius: 8px; padding: 15px; margin: 15px 0; }
      .success-box { background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); border-radius: 8px; padding: 15px; margin: 15px 0; }
      .info-box { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); border-radius: 8px; padding: 15px; margin: 15px 0; }
      .metric { display: inline-block; text-align: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; margin: 5px; min-width: 100px; }
      .metric-value { font-size: 28px; font-weight: bold; color: #00ff88; }
      .metric-label { font-size: 12px; color: #888; text-transform: uppercase; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      .badge-critical { background: #ff4444; color: white; }
      .badge-high { background: #ff8800; color: white; }
      .badge-medium { background: #ffcc00; color: #333; }
      .badge-low { background: #44aa44; color: white; }
      .footer { background: rgba(0,0,0,0.3); padding: 20px 30px; text-align: center; font-size: 12px; color: #666; }
      .location-info { background: rgba(0,212,255,0.05); border-left: 3px solid #00d4ff; padding: 10px 15px; margin: 10px 0; }
      .remediation-step { background: rgba(0,255,136,0.05); padding: 10px 15px; margin: 5px 0; border-radius: 6px; border-left: 3px solid #00ff88; }
      .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #0a0a1a; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
    </style>
  `;

  switch (type) {
    case 'network_registered':
      return {
        subject: `🌐 Network Registered: ${data.networkName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🌐 New Network Registration</h1>
              </div>
              <div class="content">
                <div class="success-box">
                  <h2 style="margin-top: 0; color: #00ff88;">Network Successfully Registered</h2>
                  <p>A new network infrastructure has been registered in the Enterprise Network Monitor.</p>
                </div>
                
                <h3>📋 Network Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Network Name:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.networkName || 'N/A'}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Network Range:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-family: monospace;">${data.networkRange || 'N/A'}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Sector:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.sector || 'N/A'}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Contact Person:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.contactPerson || 'N/A'}</td></tr>
                  <tr><td style="padding: 10px;"><strong>Registration Time:</strong></td><td style="padding: 10px;">${formattedTime}</td></tr>
                </table>

                ${data.geoLocation ? `
                <div class="location-info">
                  <h4 style="margin-top: 0;">📍 Location Information</h4>
                  <p><strong>Location:</strong> ${data.location || `${data.geoLocation.city || ''}, ${data.geoLocation.country || ''}`}</p>
                  <p><strong>ISP/Organization:</strong> ${data.geoLocation.organization || data.geoLocation.isp || 'Unknown'}</p>
                  ${data.geoLocation.latitude && data.geoLocation.longitude ? 
                    `<p><strong>Coordinates:</strong> ${data.geoLocation.latitude.toFixed(4)}, ${data.geoLocation.longitude.toFixed(4)}</p>` : ''}
                </div>
                ` : ''}

                <p style="margin-top: 20px;">This network is now pending verification. Once verified, full security monitoring will be activated.</p>
              </div>
              <div class="footer">
                <p>Enterprise Network Monitor - Sentinel Security Platform</p>
                <p>© ${new Date().getFullYear()} Advanced Security Intelligence</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'threat_detected':
      const severityBadge = `<span class="badge badge-${data.threatSeverity?.toLowerCase() || 'medium'}">${data.threatSeverity?.toUpperCase() || 'MEDIUM'}</span>`;
      return {
        subject: `🚨 THREAT DETECTED [${data.threatSeverity?.toUpperCase()}]: ${data.threatType} on ${data.deviceName || data.deviceIp}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(90deg, #ff4444 0%, #ff8800 100%);">
                <h1>🚨 Security Threat Detected</h1>
              </div>
              <div class="content">
                <div class="alert-box">
                  <h2 style="margin-top: 0; color: #ff4444;">Immediate Attention Required</h2>
                  <p>A security threat has been detected on your monitored infrastructure.</p>
                </div>
                
                <h3>⚠️ Threat Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Severity:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${severityBadge}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Threat Type:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.threatType || 'Unknown Threat'}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Affected Device:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.deviceName || 'Unknown'}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>IP Address:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-family: monospace;">${data.deviceIp || 'N/A'}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Network:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.networkName || 'Unknown'}</td></tr>
                  <tr><td style="padding: 10px;"><strong>Detected At:</strong></td><td style="padding: 10px;">${formattedTime}</td></tr>
                </table>

                ${data.threatDetails ? `
                <div class="info-box">
                  <h4 style="margin-top: 0;">📝 Details</h4>
                  <p>${data.threatDetails}</p>
                </div>
                ` : ''}

                ${data.geoLocation ? `
                <div class="location-info">
                  <h4 style="margin-top: 0;">📍 Threat Origin Location</h4>
                  <p><strong>Country:</strong> ${data.geoLocation.country || 'Unknown'}</p>
                  <p><strong>City:</strong> ${data.geoLocation.city || 'Unknown'}</p>
                  <p><strong>ISP:</strong> ${data.geoLocation.isp || 'Unknown'}</p>
                  ${data.geoLocation.latitude && data.geoLocation.longitude ? 
                    `<p><strong>Coordinates:</strong> ${data.geoLocation.latitude.toFixed(4)}, ${data.geoLocation.longitude.toFixed(4)}</p>` : ''}
                </div>
                ` : ''}

                ${data.remediationSteps && data.remediationSteps.length > 0 ? `
                <h3>🔧 Recommended Remediation Steps</h3>
                ${data.remediationSteps.map((step, i) => `<div class="remediation-step"><strong>Step ${i + 1}:</strong> ${step}</div>`).join('')}
                ` : ''}

                <p style="margin-top: 20px;">
                  <a href="#" class="btn">View in Dashboard</a>
                </p>
              </div>
              <div class="footer">
                <p>Enterprise Network Monitor - Sentinel Security Platform</p>
                <p>This is an automated security alert. Please investigate immediately.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'threat_resolved':
      return {
        subject: `✅ Threat Resolved: ${data.threatType} on ${data.deviceName || data.deviceIp}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Threat Successfully Resolved</h1>
              </div>
              <div class="content">
                <div class="success-box">
                  <h2 style="margin-top: 0; color: #00ff88;">Security Threat Neutralized</h2>
                  <p>The detected threat has been successfully resolved and your infrastructure is now secure.</p>
                </div>
                
                <h3>📋 Resolution Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Threat Type:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.threatType || 'Unknown'}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><strong>Device:</strong></td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${data.deviceName || 'Unknown'} (${data.deviceIp || 'N/A'})</td></tr>
                  <tr><td style="padding: 10px;"><strong>Resolved At:</strong></td><td style="padding: 10px;">${formattedTime}</td></tr>
                </table>

                ${data.remediationSteps && data.remediationSteps.length > 0 ? `
                <h3>🔧 Actions Taken</h3>
                ${data.remediationSteps.map((step, i) => `<div class="remediation-step">${step}</div>`).join('')}
                ` : ''}
              </div>
              <div class="footer">
                <p>Enterprise Network Monitor - Sentinel Security Platform</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'network_verified':
      return {
        subject: `✓ Network Verified: ${data.networkName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Network Verification Complete</h1>
              </div>
              <div class="content">
                <div class="success-box">
                  <h2 style="margin-top: 0; color: #00ff88;">Network Now Active</h2>
                  <p>Your network <strong>${data.networkName}</strong> has been verified and is now under full security monitoring.</p>
                </div>
                
                <h3>🛡️ Security Features Activated</h3>
                <ul>
                  <li>Real-time threat detection</li>
                  <li>Automated threat response</li>
                  <li>Network traffic analysis</li>
                  <li>Device monitoring</li>
                  <li>Security event logging</li>
                  <li>Incident response integration</li>
                </ul>

                <p>Network Range: <code style="background: rgba(0,212,255,0.2); padding: 2px 8px; border-radius: 4px;">${data.networkRange}</code></p>
              </div>
              <div class="footer">
                <p>Enterprise Network Monitor - Sentinel Security Platform</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'daily_report':
      return {
        subject: `📊 Daily Security Report - ${new Date().toLocaleDateString()}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Daily Security Report</h1>
              </div>
              <div class="content">
                <p style="color: #888;">Report generated: ${formattedTime}</p>
                
                <h3>📈 Today's Metrics</h3>
                <div style="text-align: center; margin: 20px 0;">
                  <div class="metric">
                    <div class="metric-value">${data.metrics?.totalDevices || 0}</div>
                    <div class="metric-label">Devices Monitored</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value" style="color: #ff4444;">${data.metrics?.activeThreats || 0}</div>
                    <div class="metric-label">Active Threats</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${data.metrics?.resolvedThreats || 0}</div>
                    <div class="metric-label">Threats Resolved</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${data.metrics?.uptime?.toFixed(2) || 99.99}%</div>
                    <div class="metric-label">Uptime</div>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p>Enterprise Network Monitor - Sentinel Security Platform</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    default:
      return {
        subject: `🛡️ Security Alert - Enterprise Network Monitor`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🛡️ Security Notification</h1>
              </div>
              <div class="content">
                <div class="info-box">
                  <p>A security event has occurred in your monitored infrastructure.</p>
                  <p>Time: ${formattedTime}</p>
                </div>
              </div>
              <div class="footer">
                <p>Enterprise Network Monitor - Sentinel Security Platform</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Network security notification request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Handle both legacy format (type, recipients, data) and new format (type, network/threat, recipientEmail)
    let type: string;
    let recipients: string[];
    let data: NotificationRequest['data'];

    if (body.recipients) {
      // Legacy format
      type = body.type;
      recipients = body.recipients;
      data = body.data;
    } else {
      // New format from frontend hooks
      type = body.type === 'registration' ? 'network_registered' : 
             body.type === 'threat' ? 'threat_detected' :
             body.type === 'resolved' ? 'threat_resolved' : body.type;
      
      recipients = body.recipientEmail ? [body.recipientEmail] : [];
      
      if (body.network) {
        data = {
          networkName: body.network.name,
          networkRange: body.network.networkRange,
          sector: body.network.sector,
          location: body.network.location,
        };
      } else if (body.threat) {
        data = {
          threatType: body.threat.type,
          threatSeverity: body.threat.severity,
          deviceName: body.threat.deviceName,
          deviceIp: body.threat.deviceIp,
          networkName: body.threat.networkName,
          threatDetails: body.threat.description,
          remediationSteps: body.threat.remediationSteps,
          geoLocation: body.threat.geoLocation,
        };
      } else {
        data = {};
      }
    }

    console.log(`Processing notification type: ${type} for ${recipients.length} recipients`);

    if (!recipients || recipients.length === 0) {
      console.log("No recipients provided, notification not sent");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients provided" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, html } = getEmailTemplate(type, data);

    const emailPromises = recipients.map(async (email) => {
      try {
        const response = await resend.emails.send({
          from: "Sentinel Security <security@resend.dev>",
          to: [email],
          subject,
          html,
        });
        console.log(`Email sent to ${email}:`, response);
        return { email, success: true };
      } catch (error: any) {
        console.error(`Failed to send email to ${email}:`, error);
        return { email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    // Log notification to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from('security_audit_log').insert({
      event_type: 'notification_sent',
      event_category: 'communication',
      severity: type.includes('threat') ? 'warning' : 'info',
      action_performed: `${type} notification sent to ${successCount}/${recipients.length} recipients`,
      metadata: {
        notification_type: type,
        recipients_count: recipients.length,
        success_count: successCount,
        network_name: data.networkName,
        threat_type: data.threatType,
      }
    });

    console.log(`Notification complete: ${successCount}/${recipients.length} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: recipients.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notification handler:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
