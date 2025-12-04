import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface RadarScannerProps {
  size?: number;
  className?: string;
  threats?: number;
}

export const RadarScanner = ({ size = 200, className, threats = 0 }: RadarScannerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Background circles
      ctx.strokeStyle = "rgba(0, 212, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cross lines
      ctx.strokeStyle = "rgba(0, 212, 255, 0.1)";
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX, size - 10);
      ctx.moveTo(10, centerY);
      ctx.lineTo(size - 10, centerY);
      ctx.stroke();

      // Sweep gradient
      const gradient = ctx.createConicGradient(angle, centerX, centerY);
      gradient.addColorStop(0, "rgba(0, 212, 255, 0.3)");
      gradient.addColorStop(0.1, "rgba(0, 212, 255, 0.1)");
      gradient.addColorStop(0.2, "rgba(0, 212, 255, 0)");
      gradient.addColorStop(1, "rgba(0, 212, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Sweep line
      ctx.strokeStyle = "rgba(0, 212, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();

      // Center dot
      ctx.fillStyle = "rgba(0, 212, 255, 1)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Threat blips (random positions based on threat count)
      if (threats > 0) {
        const blipPositions = [
          { x: 0.3, y: 0.4, intensity: 0.9 },
          { x: 0.7, y: 0.3, intensity: 0.7 },
          { x: 0.6, y: 0.7, intensity: 0.8 },
          { x: 0.2, y: 0.6, intensity: 0.6 },
          { x: 0.8, y: 0.5, intensity: 0.75 },
        ];

        for (let i = 0; i < Math.min(threats, blipPositions.length); i++) {
          const blip = blipPositions[i];
          const blipX = size * blip.x;
          const blipY = size * blip.y;
          
          // Pulsing effect
          const pulseIntensity = 0.5 + Math.sin(Date.now() / 200 + i) * 0.5;
          
          ctx.fillStyle = `rgba(255, 71, 87, ${blip.intensity * pulseIntensity})`;
          ctx.beginPath();
          ctx.arc(blipX, blipY, 4 + pulseIntensity * 2, 0, Math.PI * 2);
          ctx.fill();

          // Glow
          const glowGradient = ctx.createRadialGradient(blipX, blipY, 0, blipX, blipY, 15);
          glowGradient.addColorStop(0, `rgba(255, 71, 87, ${0.3 * pulseIntensity})`);
          glowGradient.addColorStop(1, "rgba(255, 71, 87, 0)");
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(blipX, blipY, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      angle += 0.02;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [size, threats]);

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
