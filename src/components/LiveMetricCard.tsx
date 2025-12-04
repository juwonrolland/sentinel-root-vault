import { useEffect, useState } from "react";
import { Activity, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveMetricCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "success" | "warning" | "critical" | "info";
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LiveMetricCard = ({
  title,
  value,
  suffix = "",
  icon,
  trend = "neutral",
  trendValue,
  status = "info",
  animate = true,
  className,
  onClick,
}: LiveMetricCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    if (typeof value === "number" && animate) {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    } else {
      setDisplayValue(typeof value === "number" ? value : 0);
    }
  }, [value, animate]);

  const statusColors = {
    success: "border-success/30 hover:border-success/50 hover:shadow-success",
    warning: "border-warning/30 hover:border-warning/50 hover:shadow-[0_0_30px_hsl(38_92%_50%/0.4)]",
    critical: "border-destructive/30 hover:border-destructive/50 hover:shadow-threat",
    info: "border-primary/20 hover:border-primary/40 hover:shadow-glow",
  };

  const statusGlow = {
    success: "bg-success",
    warning: "bg-warning",
    critical: "bg-destructive",
    info: "bg-primary",
  };

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "metric-card group transition-all duration-500",
        onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : "cursor-default",
        statusColors[status],
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      {/* Status indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full animate-pulse", statusGlow[status])} />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Live</span>
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
      </div>

      {/* Icon */}
      <div className="mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
          "bg-gradient-to-br from-primary/20 to-accent/10 group-hover:shadow-glow-sm"
        )}>
          {icon}
        </div>
      </div>

      {/* Title */}
      <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">{title}</p>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-foreground font-mono">
          {typeof value === "number" ? displayValue.toLocaleString() : value}
        </span>
        {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
      </div>

      {/* Trend */}
      {trendValue && (
        <div className={cn("mt-2 flex items-center gap-1 text-sm", trendColors[trend])}>
          {trend === "up" && "↑"}
          {trend === "down" && "↓"}
          {trend === "neutral" && "→"}
          <span>{trendValue}</span>
        </div>
      )}

      {/* Bottom gradient line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-500" />
    </div>
  );
};
