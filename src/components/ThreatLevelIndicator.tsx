import { cn } from "@/lib/utils";

interface ThreatLevelIndicatorProps {
  level: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ThreatLevelIndicator = ({
  level,
  label = "Threat Level",
  showPercentage = true,
  size = "md",
  className,
}: ThreatLevelIndicatorProps) => {
  const getColor = (value: number) => {
    if (value <= 25) return { bg: "bg-success", text: "text-success", label: "LOW" };
    if (value <= 50) return { bg: "bg-info", text: "text-info", label: "MODERATE" };
    if (value <= 75) return { bg: "bg-warning", text: "text-warning", label: "HIGH" };
    return { bg: "bg-destructive", text: "text-destructive", label: "CRITICAL" };
  };

  const colors = getColor(level);
  
  const heights = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold uppercase tracking-wider", colors.text)}>
            {colors.label}
          </span>
          {showPercentage && (
            <span className="text-sm font-mono text-foreground">{level}%</span>
          )}
        </div>
      </div>
      <div className={cn("threat-level", heights[size])}>
        <div
          className={cn("threat-level-bar", colors.bg)}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
};
