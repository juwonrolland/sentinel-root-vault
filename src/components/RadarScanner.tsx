import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ThreatLocation {
  id: string;
  angle: number;
  distance: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  source: string;
}

interface RadarScannerProps {
  size?: number;
  className?: string;
  threats?: number;
}

// Convert IP to simulated direction/distance
const ipToRadarPosition = (ip: string): { angle: number; distance: number } => {
  const parts = ip.split('.').map(Number);
  const hash = parts.reduce((a, b) => a + b, 0);
  return {
    angle: (hash * 37) % 360,
    distance: 0.3 + ((hash * 13) % 60) / 100
  };
};

const severityColors = {
  critical: { fill: 'rgba(255, 71, 87, 1)', glow: 'rgba(255, 71, 87, 0.6)' },
  high: { fill: 'rgba(255, 165, 2, 1)', glow: 'rgba(255, 165, 2, 0.6)' },
  medium: { fill: 'rgba(0, 212, 255, 1)', glow: 'rgba(0, 212, 255, 0.6)' },
  low: { fill: 'rgba(46, 213, 115, 1)', glow: 'rgba(46, 213, 115, 0.6)' }
};

export const RadarScanner = ({ size = 200, className, threats = 0 }: RadarScannerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [threatLocations, setThreatLocations] = useState<ThreatLocation[]>([]);

  // Fetch real threat data
  useEffect(() => {
    const loadThreats = async () => {
      const { data } = await supabase
        .from('security_events')
        .select('id, event_type, severity, source_ip')
        .not('source_ip', 'is', null)
        .order('detected_at', { ascending: false })
        .limit(10);

      if (data) {
        const locations = data.map(event => {
          const pos = ipToRadarPosition(event.source_ip || '0.0.0.0');
          return {
            id: event.id,
            angle: pos.angle,
            distance: pos.distance,
            severity: event.severity as ThreatLocation['severity'],
            type: event.event_type,
            source: event.source_ip || 'Unknown'
          };
        });
        setThreatLocations(locations);
      }
    };

    loadThreats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('radar-threats')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        const event = payload.new as any;
        if (event.source_ip) {
          const pos = ipToRadarPosition(event.source_ip);
          const newThreat: ThreatLocation = {
            id: event.id,
            angle: pos.angle,
            distance: pos.distance,
            severity: event.severity,
            type: event.event_type,
            source: event.source_ip
          };
          setThreatLocations(prev => [newThreat, ...prev].slice(0, 10));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 10;

      // Background circles with labels
      ctx.strokeStyle = "rgba(0, 212, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(0, 212, 255, 0.4)";
      
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
        
        // Range labels
        const rangeLabel = `${i * 25}%`;
        ctx.fillText(rangeLabel, centerX + 3, centerY - (radius / 4) * i + 10);
      }

      // Cross lines with cardinal directions
      ctx.strokeStyle = "rgba(0, 212, 255, 0.1)";
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX, size - 10);
      ctx.moveTo(10, centerY);
      ctx.lineTo(size - 10, centerY);
      ctx.stroke();

      // Cardinal direction labels
      ctx.fillStyle = "rgba(0, 212, 255, 0.6)";
      ctx.font = "9px monospace";
      ctx.fillText("N", centerX - 4, 20);
      ctx.fillText("S", centerX - 4, size - 12);
      ctx.fillText("E", size - 18, centerY + 3);
      ctx.fillText("W", 8, centerY + 3);

      // Sweep gradient
      const gradient = ctx.createConicGradient(angle, centerX, centerY);
      gradient.addColorStop(0, "rgba(0, 212, 255, 0.4)");
      gradient.addColorStop(0.1, "rgba(0, 212, 255, 0.15)");
      gradient.addColorStop(0.2, "rgba(0, 212, 255, 0)");
      gradient.addColorStop(1, "rgba(0, 212, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Sweep line
      ctx.strokeStyle = "rgba(0, 212, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();

      // Center dot with glow
      const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
      centerGlow.addColorStop(0, "rgba(0, 212, 255, 0.5)");
      centerGlow.addColorStop(1, "rgba(0, 212, 255, 0)");
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(0, 212, 255, 1)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw threat blips from real data
      const displayThreats = threatLocations.length > 0 ? threatLocations : [];
      
      displayThreats.forEach((threat, i) => {
        const threatAngleRad = (threat.angle * Math.PI) / 180;
        const threatRadius = threat.distance * radius;
        const blipX = centerX + Math.cos(threatAngleRad) * threatRadius;
        const blipY = centerY + Math.sin(threatAngleRad) * threatRadius;
        
        // Calculate if sweep has passed this blip recently
        const sweepAngle = (angle * 180 / Math.PI) % 360;
        const angleDiff = Math.abs(sweepAngle - threat.angle);
        const recentlySwept = angleDiff < 45 || angleDiff > 315;
        
        // Pulsing effect
        const pulseIntensity = 0.5 + Math.sin(Date.now() / 200 + i) * 0.5;
        const colors = severityColors[threat.severity];
        
        // Blip glow (brighter when recently swept)
        const glowIntensity = recentlySwept ? 0.8 : 0.3;
        const glowGradient = ctx.createRadialGradient(blipX, blipY, 0, blipX, blipY, 18);
        glowGradient.addColorStop(0, colors.glow.replace('0.6', String(glowIntensity * pulseIntensity)));
        glowGradient.addColorStop(1, "rgba(255, 71, 87, 0)");
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(blipX, blipY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Blip dot
        ctx.fillStyle = colors.fill.replace('1)', `${0.6 + pulseIntensity * 0.4})`);
        ctx.beginPath();
        ctx.arc(blipX, blipY, 4 + pulseIntensity * 2, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator line from center to threat
        if (threat.severity === 'critical' || threat.severity === 'high') {
          ctx.strokeStyle = colors.fill.replace('1)', '0.3)');
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(blipX, blipY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Threat count indicator
      if (displayThreats.length > 0) {
        ctx.fillStyle = "rgba(255, 71, 87, 0.9)";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`${displayThreats.length} ACTIVE`, 8, size - 8);
      } else {
        ctx.fillStyle = "rgba(46, 213, 115, 0.9)";
        ctx.font = "bold 10px monospace";
        ctx.fillText("CLEAR", 8, size - 8);
      }

      angle += 0.02;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [size, threatLocations]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full"
      />
      {/* Outer ring glow */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: "inset 0 0 30px rgba(0, 212, 255, 0.1), 0 0 20px rgba(0, 212, 255, 0.2)"
        }}
      />
    </div>
  );
};
